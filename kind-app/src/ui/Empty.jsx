// ui-core · Empty — "nothing here yet" with some dignity: a reticle, a plain line, and one clear action.
// `art` may be a glyph name, an element, or any node (e.g. an <art/> scene); it sits inside the reticle.
import { cx, renderIcon } from './Button.jsx'

export function Empty({ art, title, body, action, className, ...rest }) {
  const node = typeof art === 'string' || (art && (typeof art === 'function' || art.$$typeof)) ? renderIcon(art, 32) : art
  return (
    <div className={cx('k-empty', className)} {...rest}>
      {art ? (
        <div className="k-empty__art" aria-hidden="true">
          <i className="k-empty__ret" />
          <span className="k-empty__glyph">{node}</span>
        </div>
      ) : null}
      {title ? <p className="k-empty__title">{title}</p> : null}
      {body ? <p className="k-empty__body">{body}</p> : null}
      {action ? <div className="k-empty__action">{action}</div> : null}
    </div>
  )
}

export default Empty
