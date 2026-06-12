import type { ReactNode, Ref } from 'react'

import { API_DOCS_URL, isStaticPortfolioHost } from '../api/client'

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  focusRef,
  tabIndex,
}: {
  title: string
  description: string
  eyebrow?: string
  action?: ReactNode
  focusRef?: Ref<HTMLDivElement>
  tabIndex?: number
}) {
  const showApiDocs = !isStaticPortfolioHost()

  return (
    <div className="page-header" ref={focusRef} tabIndex={tabIndex}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action || showApiDocs ? (
        <div className="page-actions">
          {action}
          {showApiDocs ? (
            <a className="docs-link" href={API_DOCS_URL} target="_blank" rel="noreferrer">
              API docs
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
