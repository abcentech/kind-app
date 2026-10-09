// Links — Kids Inspiring Nation, one tap away. External anchors, new tab, brand glyphs.
import { LINKS, SITE } from '../../config.js'
import { labels } from '../../copy.js'
import { Icon } from '../../icons.jsx'
import { Row, RowGroup } from '../../ui/index.js'

export default function Links({ s }) {
  const L = labels.links
  const items = [
    { icon: 'youtube', title: L.youtube, href: s?.channel },
    { icon: 'whatsapp', title: L.whatsapp, href: LINKS.whatsapp },
    { icon: 'telegram', title: L.telegram, href: LINKS.telegram },
    { icon: 'instagram', title: L.instagram, href: LINKS.instagram },
    { icon: 'globe', title: L.site, href: SITE },
    { icon: 'cap', title: L.gu, href: LINKS.gu },
    { icon: 'heart', title: L.give, href: LINKS.give },
  ].filter((x) => x.href)
  return (
    <section className="me-sec" aria-label={labels.me.links}>
      <RowGroup title={labels.me.links}>
        {items.map((x) => (
          <Row
            key={x.icon} as="a" href={x.href} target="_blank" rel="noopener noreferrer" icon={x.icon} title={x.title}
            trailing={<Icon name="external" size={16} aria-label="Opens in a new tab" />}
          />
        ))}
      </RowGroup>
    </section>
  )
}
