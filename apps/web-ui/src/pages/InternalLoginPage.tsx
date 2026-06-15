import type { FormEvent } from 'react'
import { Activity, Building2, Radio, ShieldCheck } from 'lucide-react'

export function InternalLoginPage({
  adminEmail,
  onAdminEmail,
  onLogin,
}: {
  adminEmail: string
  onAdminEmail: (value: string) => void
  onLogin: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <main
      className="campaignos-redesign dark min-h-screen w-full overflow-hidden"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[216px_1fr]">
        <aside className="hidden lg:flex flex-col" style={{ background: '#08090D', borderRight: '1px solid rgba(255,255,255,0.045)' }}>
          <div className="flex h-14 items-center gap-2.5 px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.045)' }}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #0FEBA8 0%, #0BC8A0 100%)' }}>
              <Radio size={13} color="#08090D" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold tracking-tight" style={{ color: '#E4E6EF' }}>CampaignOS</span>
          </div>

          <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.045)' }}>
            <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.66)' }}>Active console</p>
              <p className="text-[13px] font-semibold" style={{ color: '#E4E6EF' }}>CampaignOS SaaS</p>
              <span
                className="mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(15,235,168,0.12)', color: '#0FEBA8', border: '1px solid rgba(15,235,168,0.22)' }}
              >
                SaaS Internal Admin
              </span>
            </div>
          </div>

          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.045)' }}>
            <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#0FEBA8' }}>Platform scope</p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.66)' }}>All customer companies</p>
            </div>
          </div>

          <div className="mt-auto px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.045)' }}>
            <div className="flex items-center gap-2.5 px-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: '#0FEBA8', color: '#08090D' }}>OP</div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>ops@example.test</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.66)' }}>Internal operator</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex h-12 items-center justify-between px-4 lg:h-14 lg:px-6" style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-6 w-6 items-center justify-center rounded" style={{ background: '#0FEBA8' }}>
                <Radio size={12} color="#08090D" strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-bold" style={{ color: 'var(--foreground)' }}>CampaignOS</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Admin Console</p>
              <h1 className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>Internal admin sign in</h1>
            </div>
            <span className="rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#0FEBA8', borderColor: 'rgba(15,235,168,0.22)', background: 'rgba(15,235,168,0.1)' }}>
              Secure demo
            </span>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-8">
            <div className="flex flex-col justify-between rounded-lg border p-5 lg:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'rgba(15,235,168,0.08)', border: '1px solid rgba(15,235,168,0.22)' }}>
                  <ShieldCheck size={20} style={{ color: '#0FEBA8' }} />
                </div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#0FEBA8' }}>SaaS Internal Admin</p>
                <h2 className="max-w-xl text-[24px] font-bold tracking-tight lg:text-[32px]" style={{ color: 'var(--foreground)', lineHeight: 1.12 }}>
                  Operator console
                </h2>
                <p className="mt-3 max-w-2xl text-[13px] leading-6" style={{ color: 'var(--muted-foreground)' }}>
                  Create customer companies, manage contracted limits, inspect tenant usage, and keep customer access separate from internal operations.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Companies', value: 'Tenant health', icon: Building2 },
                  { label: 'Usage', value: 'Cross-tenant reporting', icon: Activity },
                  { label: 'Access', value: 'Internal only', icon: ShieldCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg border p-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}>
                    <Icon size={14} style={{ color: '#0FEBA8' }} />
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                    <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--foreground)' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <form className="self-start rounded-lg border p-4 lg:p-5" onSubmit={onLogin} style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Internal team</p>
                <h2 className="mt-1 text-[16px] font-semibold" style={{ color: 'var(--foreground)' }}>Admin access</h2>
                <p className="mt-2 text-[12px] leading-5" style={{ color: 'var(--muted-foreground)' }}>
                  Demo login uses <span className="font-mono" style={{ color: 'var(--foreground)' }}>ops@example.test</span>. No password is required in this demo flow.
                </p>
              </div>

              <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                Admin email
                <input
                  className="mt-1.5 h-9 w-full rounded border px-3 text-[13px] outline-none focus:ring-1 focus:ring-[#0FEBA8]/30"
                  type="email"
                  value={adminEmail}
                  onChange={(event) => onAdminEmail(event.target.value)}
                  placeholder="ops@example.test"
                  style={{ background: 'var(--input)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                />
              </label>

              <button
                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded text-[13px] font-bold transition-opacity hover:opacity-85"
                type="submit"
                style={{ background: '#0FEBA8', color: '#0C0D12' }}
              >
                Login as internal admin
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
