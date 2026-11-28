/**
 * Top-level safety net: if any screen throws while rendering, show a short message and a way
 * back instead of a blank app. Moving to another screen (a hash change) tries again.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { href } from './router'

interface Props {
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Screen failed to render', error, info.componentStack)
  }

  componentDidMount(): void {
    window.addEventListener('hashchange', this.reset)
  }

  componentWillUnmount(): void {
    window.removeEventListener('hashchange', this.reset)
  }

  private reset = () => {
    if (this.state.failed) this.setState({ failed: false })
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <main className="screen">
        <h1>Something went wrong</h1>
        <p>This screen could not be shown. Your progress is saved.</p>
        <a className="btn" href={href({ name: 'hub' })}>
          Back to hub
        </a>
      </main>
    )
  }
}
