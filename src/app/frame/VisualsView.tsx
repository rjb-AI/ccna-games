import { TopologyView } from '../topology/TopologyView'
import type { CodeVisual, TableVisual, Visual } from './visuals'

/** Allow line breaks only after dots, colons, commas and slashes (MACs, IPv4 and IPv6, lists). */
function breakable(text: string) {
  const parts = text.split(/(?<=[.,/:])/)
  return parts.map((p, i) => (
    <span key={i}>
      {p}
      {i < parts.length - 1 && <wbr />}
    </span>
  ))
}

function TableView({ v }: { v: TableVisual }) {
  return (
    <div className="qtable">
      <table>
        <caption>{v.caption}</caption>
        <thead>
          <tr>
            {v.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {v.rows.length === 0 ? (
            <tr>
              <td colSpan={v.columns.length}>{v.empty ?? 'Empty'}</td>
            </tr>
          ) : (
            v.rows.map((r, i) => (
              <tr key={i} className={i === v.highlightRow ? 'is-hot' : undefined}>
                {r.map((cell, j) => (
                  <td key={j}>{breakable(cell)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function CodeView({ v }: { v: CodeVisual }) {
  return (
    <figure className="qcode">
      {v.caption && <figcaption>{v.caption}</figcaption>}
      <ol>
        {v.lines.map((l, i) => (
          <li key={i} className={i === v.highlightLine ? 'is-hot' : undefined}>
            <code>{l}</code>
          </li>
        ))}
      </ol>
    </figure>
  )
}

export function Visuals({ visuals }: { visuals?: readonly Visual[] }) {
  if (!visuals?.length) return null
  return (
    <>
      {visuals.map((v, i) =>
        v.kind === 'topology' ? (
          <TopologyView key={i} v={v} />
        ) : v.kind === 'code' ? (
          <CodeView key={i} v={v} />
        ) : (
          <TableView key={i} v={v} />
        ),
      )}
    </>
  )
}
