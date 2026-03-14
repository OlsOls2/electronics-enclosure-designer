import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import type { AccountState, AccountTier } from '../types/account'
import { resolveAccountTier } from '../services/accountService'
import { getErrorMessage } from '../utils/error'

const guestState: AccountState = {
  tier: 'guest',
  isPaid: false,
  loading: false,
  error: null,
}

interface ResolvedAccountState {
  userId: string | null
  tier: AccountTier
  error: string | null
}

export function useAccountTier(user: User | null, authEnabled: boolean): AccountState {
  const [resolved, setResolved] = useState<ResolvedAccountState>({
    userId: null,
    tier: 'free',
    error: null,
  })

  useEffect(() => {
    if (!authEnabled || !user) {
      return
    }

    let cancelled = false

    void resolveAccountTier(user)
      .then((tier) => {
        if (cancelled) {
          return
        }

        setResolved({
          userId: user.uid,
          tier,
          error: null,
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setResolved({
          userId: user.uid,
          tier: 'free',
          error: getErrorMessage(error, 'Unable to determine account tier.'),
        })
      })

    return () => {
      cancelled = true
    }
  }, [authEnabled, user])

  if (!authEnabled || !user) {
    return guestState
  }

  const loading = resolved.userId !== user.uid
  const tier = loading ? 'free' : resolved.tier

  return {
    tier,
    isPaid: tier === 'paid',
    loading,
    error: loading ? null : resolved.error,
  }
}
