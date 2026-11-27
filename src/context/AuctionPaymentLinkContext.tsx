'use client'

import { createContext, useContext, type ReactNode } from 'react'

// PublicHeader.tsx needs only this one boolean (whether to show the
// "Auction Payment" nav link) — not the whole AuctionPaymentSettings shape,
// so this is its own tiny context rather than reusing/extending
// ContactSettingsContext's unrelated concern. Defaults to false if somehow
// rendered outside the provider (shouldn't happen — PublicLayout always
// wraps the public site), same reasoning as ContactSettingsContext.
const AuctionPaymentLinkContext = createContext<boolean>(false)

export const AuctionPaymentLinkProvider = ({ showInHeader, children }: { showInHeader: boolean; children: ReactNode }) => (
  <AuctionPaymentLinkContext.Provider value={showInHeader}>{children}</AuctionPaymentLinkContext.Provider>
)

export const useShowAuctionPaymentLink = () => useContext(AuctionPaymentLinkContext)
