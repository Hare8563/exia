#!/usr/bin/env python3
"""
pack_xp3.py -- XP3 archive packer for Exia asset pipeline

Usage:
    python3 scripts/pack_xp3.py <source_dir> <output_xp3_file>

Stdout:
    JSON array of {"id": "filename.ext", "rel_path": "relative/path/in/pack"}
    (one entry per packed file, suitable for deploy_pack.js --manifest)

Stderr:
    Progress messages and size statistics

XP3 format written (raw/uncompressed index):
    [Magic 11 bytes]
    [index_offset u64 LE]
    [File data segments (raw, uncompressed, contiguous)]
    [Index block: flag(0x00) + size(u64) + "File" chunks]
      Each "File" chunk:
        "info" sub: flags(u32) + org_size(u64) + arc_size(u64) + name_len(u16 code units) + name(UTF-16LE)
        "segm" sub: flags(u32=0) + offset(u64) + org_size(u64) + arc_size(u64)
        "adlr" sub: adler32(u32)
"""

import sys
import os
import struct
import json
import zlib

# ---------------------------------------------------------------------------
# XP3 constants
# ---------------------------------------------------------------------------

XP3_MAGIC = bytes([0x58, 0x50, 0x33, 0x0D, 0x0A, 0x20, 0x0A, 0x1A, 0x8B, 0x67, 0x01])
INDEX_FLAG_RAW = 0x00

# Byte offset where file data begins: magic(11) + index_offset_field(8)
DATA_START_OFFSET = 11 + 8


def _pack_u16(v: int) -> bytes:
    return struct.pack("<H", v)


def _pack_u32(v: int) -> bytes:
    return struct.pack("<I", v)


def _pack_u64(v: int) -> bytes:
    return struct.pack("<Q", v)


def _tag(s: str) -> bytes:
    return s.encode("ascii")


def _build_file_chunk(rel_path: str, data_offset: int, data: bytes) -> bytes:
    """Build the 'File' index chunk for one file."""
    name_utf16 = rel_path.encode("utf-16-le")
    name_units = len(name_utf16) // 2   # UTF-16LE code units
    data_size = len(data)
    adler = zlib.adler32(data) & 0xFFFFFFFF

    # "info" sub-chunk: flags(u32) + org_size(u64) + arc_size(u64) + name_len(u16) + name(UTF-16LE)
    info_body = (
        _pack_u32(0)
        + _pack_u64(data_size)
        + _pack_u64(data_size)
        + _pack_u16(name_units)
        + name_utf16
    )
    info_sub = _tag("info") + _pack_u64(len(info_body)) + info_body

    # "segm" sub-chunk: flags(u32=0,raw) + offset(u64) + org_size(u64) + arc_size(u64)
    segm_body = _pack_u32(0) + _pack_u64(data_offset) + _pack_u64(data_size) + _pack_u64(data_size)
    segm_sub = _tag("segm") + _pack_u64(len(segm_body)) + segm_body

    # "adlr" sub-chunk: adler32(u32)
    adlr_sub = _tag("adlr") + _pack_u64(4) + _pack_u32(adler)

    file_body = info_sub + segm_sub + adlr_sub
    return _tag("File") + _pack_u64(len(file_body)) + file_body


def pack_xp3(source_dir: str, output_path: str) -> list:
    """
    Pack all files in source_dir into an XP3 archive at output_path.
    Returns manifest: list of {"id": "filename.ext", "rel_path": "path/in/pack"}.
    """
    source_dir = os.path.abspath(source_dir)

    # Collect files
    file_entries = []
    for dirpath, _dirs, filenames in os.walk(source_dir):
        for fname in sorted(filenames):
            abs_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(abs_path, source_dir).replace("\\", "/")
            file_entries.append((abs_path, rel_path))

    if not file_entries:
        print(f"ERROR: no files found in {source_dir}", file=sys.stderr)
        sys.exit(1)

    total_files = len(file_entries)
    print(f"[pack_xp3] Found {total_files} files in {source_dir}", file=sys.stderr)

    # Load all file data
    loaded = []
    total_bytes = 0
    for abs_path, rel_path in file_entries:
        with open(abs_path, "rb") as f:
            data = f.read()
        loaded.append((rel_path, data))
        total_bytes += len(data)

    print(
        f"[pack_xp3] Total data: {total_bytes:,} bytes ({total_bytes / 1024 / 1024:.2f} MB)",
        file=sys.stderr,
    )

    # Build data area and index body
    data_area = bytearray()
    index_chunks = bytearray()
    manifest = []

    for i, (rel_path, data) in enumerate(loaded):
        offset = DATA_START_OFFSET + len(data_area)
        index_chunks.extend(_build_file_chunk(rel_path, offset, data))
        data_area.extend(data)
        manifest.append({"id": os.path.basename(rel_path), "rel_path": rel_path})

        if (i + 1) % 50 == 0 or (i + 1) == total_files:
            pct = (i + 1) / total_files * 100
            print(f"[pack_xp3] Packed {i + 1}/{total_files} ({pct:.0f}%)", file=sys.stderr)

    # Index block: flag(0x00=raw) + size(u64) + chunks
    index_block = bytes([INDEX_FLAG_RAW]) + _pack_u64(len(index_chunks)) + bytes(index_chunks)
    index_offset = DATA_START_OFFSET + len(data_area)

    # Write XP3 file
    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
    with open(output_path, "wb") as out:
        out.write(XP3_MAGIC)
        out.write(_pack_u64(index_offset))
        out.write(data_area)
        out.write(index_block)

    xp3_size = os.path.getsize(output_path)
    print(
        f"[pack_xp3] Written: {output_path} ({xp3_size:,} bytes, {xp3_size / 1024 / 1024:.2f} MB)",
        file=sys.stderr,
    )
    return manifest


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python3 pack_xp3.py <source_dir> <output_xp3_file>", file=sys.stderr)
        sys.exit(1)

    source_dir, output_path = sys.argv[1], sys.argv[2]

    if not os.path.isdir(source_dir):
        print(f"ERROR: not a directory: {source_dir}", file=sys.stderr)
        sys.exit(1)

    manifest = pack_xp3(source_dir, output_path)

    # Output manifest JSON to stdout (for deploy_pack.js --manifest)
    json.dump(manifest, sys.stdout, ensure_ascii=False, indent=2)
    print()

    print(f"[pack_xp3] Done. {len(manifest)} assets packed.", file=sys.stderr)


if __name__ == "__main__":
    main()
