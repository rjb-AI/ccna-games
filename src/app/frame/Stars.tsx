export function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`} role="img">
      {'★'.repeat(count)}
      <span className="stars-empty">{'☆'.repeat(3 - count)}</span>
    </span>
  )
}
