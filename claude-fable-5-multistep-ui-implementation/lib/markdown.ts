// Minimal markdown -> HTML for terms content (headings, bold, links, lists).

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).split(/\r?\n/)
  const out: string[] = []
  let inList = false
  let paragraph: string[] = []

  function flushParagraph() {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }

  function closeList() {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushParagraph()
      closeList()
      continue
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      closeList()
      const level = Math.min(heading[1].length + 2, 6)
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }
    const bullet = line.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()
  closeList()
  return out.join('\n')
}
