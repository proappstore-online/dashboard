import { useEffect, useState, useCallback } from 'react'
import { initPro } from '@proappstore/sdk'
import type { User, Subscription } from '@proappstore/sdk'

const app = initPro({ appId: 'dashboard' })

type View = 'home' | 'profile' | 'subscription' | 'preferences' | 'danger'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<View>('home')
  const [sub, setSub] = useState<Subscription | null>(null)
  const [prefs, setPrefs] = useState<{ theme: string; notifications: boolean }>({ theme: 'system', notifications: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    app.auth.init()
    return app.auth.onChange((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  // Load subscription + preferences when signed in
  useEffect(() => {
    if (!user) return
    const ctrl = new AbortController()
    app.subscription.status().then(setSub).catch(() => {})
    app.kv.get<{ theme: string; notifications: boolean }>('preferences', { signal: ctrl.signal })
      .then(p => { if (p) setPrefs(p) })
      .catch(() => {})
    return () => ctrl.abort()
  }, [user])

  const savePrefs = useCallback(async (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    await app.kv.set('preferences', next).catch(() => {})
  }, [prefs])

  const deleteAccount = useCallback(async () => {
    if (!confirm('Are you sure? This will delete all your data and sign you out.')) return
    // Delete all KV data
    const keys = await app.kv.list().catch(() => [] as string[])
    for (const key of keys) {
      await app.kv.delete(key).catch(() => {})
    }
    app.auth.signOut()
    setView('home')
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-[var(--muted)]">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <h1 className="display-font text-4xl font-bold text-[var(--ink)]">Pro Dashboard</h1>
          <p className="mt-2 text-[var(--muted)]">Manage your ProAppStore account, subscription, and preferences.</p>
        </div>
        <button
          onClick={() => app.auth.signIn()}
          className="rounded-2xl bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white shadow-md"
        >
          Sign in with GitHub
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <h1 className="display-font text-2xl font-bold text-[var(--ink)]">Dashboard</h1>
        <div className="flex items-center gap-3">
          <img src={user.avatarUrl ?? ''} alt="" className="h-8 w-8 rounded-full border border-[var(--line)]" />
          <span className="text-sm font-medium text-[var(--ink)]">{user.login}</span>
          <button onClick={() => app.auth.signOut()} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] py-2">Sign out</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 border-b border-[var(--line)] pb-px overflow-x-auto">
        {(['home', 'profile', 'subscription', 'preferences', 'danger'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="rounded-t-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: view === v ? 'var(--ink)' : 'var(--muted)',
              borderBottom: view === v ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {v === 'danger' ? 'Account' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 py-6">
        {view === 'home' && <HomeView user={user} sub={sub} />}
        {view === 'profile' && <ProfileView user={user} />}
        {view === 'subscription' && <SubscriptionView sub={sub} />}
        {view === 'preferences' && <PreferencesView prefs={prefs} onSave={savePrefs} />}
        {view === 'danger' && <DangerView onDelete={deleteAccount} />}
      </div>
    </div>
  )
}

function HomeView({ user, sub }: { user: User; sub: Subscription | null }) {
  const isPro = sub?.status === 'active'
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <div className="flex items-center gap-4">
          <img src={user.avatarUrl ?? ''} alt="" className="h-16 w-16 rounded-full" />
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">{user.login}</h2>
            <p className="text-sm text-[var(--muted)]">
              {isPro ? <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">PRO</span> : 'Free tier'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Plan</p>
          <p className="mt-1 text-lg font-bold text-[var(--ink)]">{isPro ? 'Pro' : 'Free'}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">User ID</p>
          <p className="mt-1 font-mono text-sm text-[var(--ink)]">{user.id}</p>
        </div>
      </div>
    </div>
  )
}

function ProfileView({ user }: { user: User }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-[var(--ink)]">Profile</h2>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">Username</label>
            <p className="text-[var(--ink)]">{user.login}</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">ID</label>
            <p className="font-mono text-sm text-[var(--ink)]">{user.id}</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-[var(--muted)]">Avatar</label>
            <img src={user.avatarUrl ?? ''} alt="" className="mt-1 h-20 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">Profile data comes from GitHub. To change your username or avatar, update your GitHub profile.</p>
    </div>
  )
}

function SubscriptionView({ sub }: { sub: Subscription | null }) {
  const isPro = sub?.status === 'active'

  const handleUpgrade = async () => {
    await app.subscription.openCheckout({
      priceId: 'price_pro_monthly',
      successUrl: window.location.origin + '?upgraded=1',
      cancelUrl: window.location.origin,
    })
  }

  const handleManage = async () => {
    await app.subscription.openPortal(window.location.origin)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-[var(--ink)]">Subscription</h2>

      {isPro ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">PRO</span>
            <span className="text-sm font-semibold text-[var(--ink)]">Active</span>
          </div>
          {sub?.currentPeriodEnd && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              {sub.cancelAtPeriodEnd && ' (cancels at end of period)'}
            </p>
          )}
          <button
            onClick={handleManage}
            className="mt-4 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--panel-hover)]"
          >
            Manage billing
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] p-6">
          <h3 className="text-lg font-bold text-[var(--ink)]">Upgrade to Pro</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">$9/month — unlock real-time rooms, AI, cron, custom domains, and more.</p>
          <button
            onClick={handleUpgrade}
            className="mt-4 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Subscribe
          </button>
        </div>
      )}
    </div>
  )
}

function PreferencesView({ prefs, onSave }: { prefs: { theme: string; notifications: boolean }; onSave: (p: Partial<{ theme: string; notifications: boolean }>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-[var(--ink)]">Preferences</h2>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-[var(--ink)]">Theme</label>
            <select
              value={prefs.theme}
              onChange={e => onSave({ theme: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm text-[var(--ink)]"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--ink)]">Email notifications</label>
            <button
              onClick={() => onSave({ notifications: !prefs.notifications })}
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ backgroundColor: prefs.notifications ? 'var(--accent)' : 'var(--line-strong)' }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ left: prefs.notifications ? '1.375rem' : '0.125rem' }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DangerView({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-[var(--ink)]">Account</h2>
      <div className="rounded-2xl border border-[var(--error)] bg-[color-mix(in_srgb,var(--error)_5%,transparent)] p-6">
        <h3 className="font-bold text-[var(--error)]">Delete account</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          This will permanently delete all your stored data (preferences, KV entries) and sign you out. Your GitHub account is not affected.
        </p>
        <button
          onClick={onDelete}
          className="mt-4 rounded-xl bg-[var(--error)] px-4 py-2 text-sm font-semibold text-white"
        >
          Delete my data
        </button>
      </div>
    </div>
  )
}
