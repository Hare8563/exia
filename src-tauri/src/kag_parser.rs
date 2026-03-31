// src-tauri/src/kag_parser.rs
use std::collections::HashMap;
use serde::Serialize;

#[derive(Debug, Serialize, Clone, PartialEq)]
#[serde(tag = "type")]
pub enum KagToken {
    Label { name: String, page_name: Option<String> },
    Tag { name: String, attrs: HashMap<String, String> },
    Text { content: String },
    Newline,
}

pub fn parse_kag_text(content: &str) -> Result<Vec<KagToken>, String> {
    let mut tokens: Vec<KagToken> = Vec::new();
    let lines: Vec<&str> = content.split('\n').collect();

    for line in lines {
        let line = line.trim_end_matches('\r');
        if line.is_empty() {
            tokens.push(KagToken::Newline);
            continue;
        }
        if line.starts_with(';') {
            tokens.push(KagToken::Newline);
            continue;
        }
        if line.starts_with('*') {
            let rest = &line[1..];
            let (name, page_name) = if let Some(pipe) = rest.find('|') {
                (rest[..pipe].to_string(), Some(rest[pipe+1..].to_string()))
            } else {
                (rest.to_string(), None)
            };
            tokens.push(KagToken::Label { name, page_name });
            tokens.push(KagToken::Newline);
            continue;
        }
        if line.starts_with('@') {
            let rest = &line[1..];
            tokens.push(parse_inline_tag(rest)?);
            tokens.push(KagToken::Newline);
            continue;
        }
        parse_inline_content(line, &mut tokens)?;
        tokens.push(KagToken::Newline);
    }

    // Strip trailing Newline tokens that have no content following them
    while tokens.last() == Some(&KagToken::Newline) {
        tokens.pop();
    }

    Ok(tokens)
}

fn parse_inline_content(line: &str, tokens: &mut Vec<KagToken>) -> Result<(), String> {
    let mut chars = line.chars().peekable();
    let mut text_buf = String::new();

    while let Some(&ch) = chars.peek() {
        if ch == '[' {
            if !text_buf.is_empty() {
                tokens.push(KagToken::Text { content: text_buf.clone() });
                text_buf.clear();
            }
            chars.next();
            let mut tag_content = String::new();
            let mut found_close = false;
            let mut depth = 1;
            for c in chars.by_ref() {
                if c == '[' { depth += 1; }
                if c == ']' {
                    depth -= 1;
                    if depth == 0 { found_close = true; break; }
                }
                tag_content.push(c);
            }
            if !found_close {
                return Err("unclosed tag bracket".to_string());
            }
            tokens.push(parse_inline_tag(&tag_content)?);
        } else {
            text_buf.push(ch);
            chars.next();
        }
    }
    if !text_buf.is_empty() {
        tokens.push(KagToken::Text { content: text_buf });
    }
    Ok(())
}

fn parse_inline_tag(content: &str) -> Result<KagToken, String> {
    let content = content.trim();
    let mut parts = content.splitn(2, |c: char| c.is_whitespace());
    let name = parts.next().unwrap_or("").to_string();
    if name.is_empty() {
        return Err("empty tag name".to_string());
    }
    let attrs_str = parts.next().unwrap_or("");
    let attrs = parse_attrs(attrs_str)?;
    Ok(KagToken::Tag { name, attrs })
}

fn parse_attrs(s: &str) -> Result<HashMap<String, String>, String> {
    let mut attrs = HashMap::new();
    let mut rest = s.trim();
    while !rest.is_empty() {
        if let Some(eq) = rest.find('=') {
            let key = rest[..eq].trim().to_string();
            rest = rest[eq+1..].trim_start();
            let (value, remaining) = if rest.starts_with('"') {
                let end = rest[1..].find('"').ok_or("Unclosed quote")?;
                let val = rest[1..end+1].to_string();
                (val, &rest[end+2..])   // (value, remaining)
            } else {
                // Unquoted values extend to the next whitespace character.
                // An `=` inside an unquoted value is treated as part of the value,
                // e.g. `foo=a=b` produces the key "foo" with value "a=b".
                let end = rest.find(|c: char| c.is_whitespace()).unwrap_or(rest.len());
                let val = rest[..end].to_string();
                (val, &rest[end..])     // (value, remaining) — same order as quoted branch
            };
            attrs.insert(key, value);
            rest = remaining.trim_start();
        } else {
            break;
        }
    }
    Ok(attrs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_label() {
        let tokens = parse_kag_text("*scene_start").unwrap();
        assert_eq!(tokens, vec![KagToken::Label { name: "scene_start".to_string(), page_name: None }]);
    }

    #[test]
    fn parses_label_with_page() {
        let tokens = parse_kag_text("*label|page").unwrap();
        assert_eq!(tokens, vec![KagToken::Label {
            name: "label".to_string(),
            page_name: Some("page".to_string()),
        }]);
    }

    #[test]
    fn parses_tag_no_attrs() {
        let tokens = parse_kag_text("[l]").unwrap();
        assert_eq!(tokens, vec![KagToken::Tag { name: "l".to_string(), attrs: HashMap::new() }]);
    }

    #[test]
    fn parses_tag_with_attrs() {
        let tokens = parse_kag_text("[image storage=bg.webp layer=base]").unwrap();
        let tag = &tokens[0];
        if let KagToken::Tag { name, attrs } = tag {
            assert_eq!(name, "image");
            assert_eq!(attrs.get("storage").unwrap(), "bg.webp");
            assert_eq!(attrs.get("layer").unwrap(), "base");
        } else { panic!("Expected Tag"); }
    }

    #[test]
    fn parses_tag_with_quoted_attr() {
        let tokens = parse_kag_text("[name text=\"Alice\"]").unwrap();
        if let KagToken::Tag { attrs, .. } = &tokens[0] {
            assert_eq!(attrs.get("text").unwrap(), "Alice");
        } else { panic!(); }
    }

    #[test]
    fn parses_at_tag_at_line_start() {
        let tokens = parse_kag_text("@bgm storage=calm.mp3").unwrap();
        assert_eq!(tokens[0], KagToken::Tag { name: "bgm".to_string(), attrs: [("storage".to_string(), "calm.mp3".to_string())].iter().cloned().collect() });
    }

    #[test]
    fn skips_comments() {
        let tokens = parse_kag_text("; this is a comment\n[l]").unwrap();
        assert!(tokens.iter().any(|t| matches!(t, KagToken::Tag { name, .. } if name == "l")));
        assert!(!tokens.iter().any(|t| matches!(t, KagToken::Text { content } if content.contains("comment"))));
    }

    #[test]
    fn parses_text() {
        let tokens = parse_kag_text("こんにちは").unwrap();
        assert_eq!(tokens, vec![KagToken::Text { content: "こんにちは".to_string() }]);
    }

    #[test]
    fn emits_newline_token() {
        let tokens = parse_kag_text("abc\ndef").unwrap();
        assert!(tokens.iter().any(|t| matches!(t, KagToken::Newline)));
    }

    #[test]
    fn at_sign_mid_text_is_text() {
        let tokens = parse_kag_text("test@example.com").unwrap();
        let text: String = tokens.iter().filter_map(|t| {
            if let KagToken::Text { content } = t { Some(content.as_str()) } else { None }
        }).collect();
        assert!(text.contains('@'));
    }

    #[test]
    fn errors_on_unclosed_bracket() {
        assert!(parse_kag_text("hello [tag").is_err());
    }

    #[test]
    fn errors_on_empty_tag_name() {
        assert!(parse_kag_text("[]").is_err());
    }

    #[test]
    fn parses_attr_with_equals_in_unquoted_value() {
        let tokens = parse_kag_text("[tag foo=a=b]").unwrap();
        if let KagToken::Tag { attrs, .. } = &tokens[0] {
            assert_eq!(attrs.get("foo").unwrap(), "a=b");
        } else { panic!(); }
    }
}
