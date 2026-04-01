// src-tauri/src/xp3.rs
use flate2::read::ZlibDecoder;
use std::io::Read;

const XP3_MAGIC: &[u8] = &[0x58,0x50,0x33,0x0d,0x0a,0x20,0x0a,0x1a,0x8b,0x67,0x01];
const INDEX_ENCODE_ZLIB: u8 = 0x01;

pub struct Xp3Entry {
    pub name: String,
    pub data: Vec<u8>,
}

fn r_u16(d: &[u8], o: usize) -> u16 { u16::from_le_bytes(d[o..o+2].try_into().unwrap()) }
fn r_u32(d: &[u8], o: usize) -> u32 { u32::from_le_bytes(d[o..o+4].try_into().unwrap()) }
fn r_u64(d: &[u8], o: usize) -> u64 { u64::from_le_bytes(d[o..o+8].try_into().unwrap()) }

fn zlib_decompress(src: &[u8], expected_size: usize) -> Result<Vec<u8>, String> {
    let mut decoder = ZlibDecoder::new(src);
    let mut buf = Vec::with_capacity(expected_size);
    decoder.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    Ok(buf)
}

pub fn extract_xp3(data: &[u8]) -> Result<Vec<Xp3Entry>, String> {
    if data.len() < 19 { return Err("file too short".into()); }
    if &data[..11] != XP3_MAGIC { return Err("invalid XP3 magic".into()); }

    let index_offset = r_u64(data, 11) as usize;
    if index_offset >= data.len() { return Err("invalid index offset".into()); }

    let flag = data[index_offset];
    let mut pos = index_offset + 1;
    let index_body: Vec<u8>;

    if pos + 8 > data.len() { return Err("truncated index flag field".into()); }

    if flag & 0x07 == INDEX_ENCODE_ZLIB {
        let comp_size = r_u64(data, pos) as usize; pos += 8;
        let orig_size = r_u64(data, pos) as usize; pos += 8;
        if pos + comp_size > data.len() {
            return Err(format!("index data out of bounds: pos={} comp_size={} len={}", pos, comp_size, data.len()));
        }
        index_body = zlib_decompress(&data[pos..pos+comp_size], orig_size)?;
    } else {
        let orig_size = r_u64(data, pos) as usize; pos += 8;
        if pos + orig_size > data.len() {
            return Err(format!("index data out of bounds: pos={} orig_size={} len={}", pos, orig_size, data.len()));
        }
        index_body = data[pos..pos+orig_size].to_vec();
    }

    let mut entries = Vec::new();
    let mut idx = 0usize;

    while idx + 12 <= index_body.len() {
        let tag = &index_body[idx..idx+4]; idx += 4;
        let chunk_size = r_u64(&index_body, idx) as usize; idx += 8;
        if idx + chunk_size > index_body.len() {
            return Err(format!("chunk out of bounds: idx={} chunk_size={} len={}", idx, chunk_size, index_body.len()));
        }
        let chunk = &index_body[idx..idx+chunk_size]; idx += chunk_size;

        if tag != b"File" { continue; }

        let mut sub = 0usize;
        let mut filename: Option<String> = None;
        let mut segments: Vec<(usize, usize, usize, bool)> = vec![];

        while sub + 12 <= chunk.len() {
            let stag = &chunk[sub..sub+4]; sub += 4;
            let ssize = r_u64(chunk, sub) as usize; sub += 8;
            if sub + ssize > chunk.len() { return Err("sub-chunk body out of bounds".into()); }
            let sbody = &chunk[sub..sub+ssize]; sub += ssize;

            if stag == b"info" && sbody.len() >= 22 {
                let name_units = r_u16(sbody, 20) as usize;
                if sbody.len() < 22 + name_units * 2 {
                    return Err(format!("info name out of bounds: sbody.len()={} name_units={}", sbody.len(), name_units));
                }
                let name_bytes = &sbody[22..22+name_units*2];
                let utf16: Vec<u16> = name_bytes.chunks(2)
                    .map(|c| u16::from_le_bytes([c[0], c[1]]))
                    .collect();
                filename = String::from_utf16(&utf16).ok();
            } else if stag == b"segm" {
                let mut s = 0usize;
                while s + 28 <= sbody.len() {
                    let flags    = r_u32(sbody, s);
                    let offset   = r_u64(sbody, s+4) as usize;
                    let org_size = r_u64(sbody, s+12) as usize;
                    let arc_size = r_u64(sbody, s+20) as usize;
                    segments.push((offset, org_size, arc_size, flags & 1 == 1));
                    s += 28;
                }
            }
        }

        if let Some(name) = filename {
            let mut file_data = Vec::new();
            for (offset, org_size, arc_size, compressed) in &segments {
                if *offset + *arc_size > data.len() {
                    return Err(format!("segment data out of bounds: offset={} arc_size={} len={}", offset, arc_size, data.len()));
                }
                let seg = &data[*offset..*offset+*arc_size];
                if *compressed {
                    file_data.extend(zlib_decompress(seg, *org_size)?);
                } else {
                    file_data.extend_from_slice(seg);
                }
            }
            entries.push(Xp3Entry { name, data: file_data });
        }
    }

    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_minimal() {
        let data = include_bytes!("../tests/fixtures/minimal.xp3");
        let entries = extract_xp3(data).expect("should extract");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "test.txt");
        assert_eq!(entries[0].data, b"hello");
    }
}
