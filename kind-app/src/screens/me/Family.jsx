// Family — parents only: the family name and the children flying with you. Removing a child asks first.
import { useState } from 'react'
import { addKid, removeKid, updateProfile, useStore } from '../../store.js'
import { labels, settingsHelp } from '../../copy.js'
import { Button, Chip, Dialog, Label, TextField, toast } from '../../ui/index.js'

const KID_MAX = 24

export default function Family() {
  const st = useStore()
  const H = settingsHelp.family
  const [fam, setFam] = useState(null)          // null = follow the store while not editing
  const [kid, setKid] = useState('')
  const [drop, setDrop] = useState(-1)

  const saveFam = () => { if (fam != null && fam.trim() !== st.familyName) updateProfile({ familyName: fam.normalize('NFC') }); setFam(null) }
  const add = (e) => {
    e?.preventDefault()
    const n = kid.normalize('NFC').trim()
    if (!n) return
    addKid(n)
    setKid('')
    toast({ title: `${n} added`, icon: 'users', tone: 'go' })
  }
  const kids = st.kids || []

  return (
    <section className="me-sec" aria-labelledby="me-family-h">
      <Label as="h2" id="me-family-h" className="me-h">{labels.me.family}</Label>
      <p className="me-help">{H.help}</p>
      <TextField
        label={H.familyName} value={fam ?? st.familyName ?? ''} maxLength={32} autoComplete="family-name" enterKeyHint="done"
        onChange={setFam} onBlur={saveFam} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      {kids.length ? (
        <ul className="me-kids" aria-label="Children">
          {kids.map((k, i) => (
            <li key={i + k.name}>
              <Chip icon="close" onClick={() => setDrop(i)} aria-label={`Remove ${k.name}`}><span lang="yo">{k.name}</span></Chip>
            </li>
          ))}
        </ul>
      ) : null}
      <form className="me-addkid" onSubmit={add}>
        <TextField
          label={H.addKid} value={kid} onChange={setKid} maxLength={KID_MAX} autoComplete="off" autoCapitalize="words" enterKeyHint="done"
          icon="users" placeholder="Name"
        />
        <Button type="submit" variant="secondary" size="md" icon="plus" disabled={!kid.trim()}>{labels.verbs.add}</Button>
      </form>
      <Dialog
        open={drop >= 0} tone="danger" title={`Remove ${kids[drop]?.name || 'this child'}?`}
        body="They leave your crew list. Lessons you finished are not affected."
        confirmLabel={labels.verbs.remove} cancelLabel={labels.verbs.cancel}
        onConfirm={() => { removeKid(drop); setDrop(-1) }} onCancel={() => setDrop(-1)}
      />
    </section>
  )
}
