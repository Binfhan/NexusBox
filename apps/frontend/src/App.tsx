import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Home from '@/pages/Home'
import { Dashboard } from '@/pages/Dashboard'

import { fetchNonce, verifySignature } from '@/lib/api'
import { ethers } from 'ethers'

export default function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('docvault_token')
  )

  const [walletAddress, setWalletAddress] = useState<string | null>(
    localStorage.getItem('docvault_wallet')
  )

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert('Vui lòng cài đặt ví Metamask!')
      return
    }

    try {
      const provider = new ethers.BrowserProvider(
        (window as any).ethereum
      )

      const accounts = await provider.send(
        'eth_requestAccounts',
        []
      )

      const address = accounts[0]

      const nonce = await fetchNonce(address)

      const signer = await provider.getSigner()

      const message = `Sign this message to login to DocVault: ${nonce}`

      const signature = await signer.signMessage(message)

      const jwtToken = await verifySignature(
        address,
        signature
      )

      setToken(jwtToken)
      setWalletAddress(address)

      localStorage.setItem(
        'docvault_token',
        jwtToken
      )

      localStorage.setItem(
        'docvault_wallet',
        address
      )

      alert('Đăng nhập ví Web3 thành công!')
    } catch (err) {
      console.error(
        'Wallet connection/auth failed:',
        err
      )

      alert('Đăng nhập thất bại!')
    }
  }

  const disconnectWallet = () => {
    setToken(null)
    setWalletAddress(null)

    localStorage.removeItem('docvault_token')
    localStorage.removeItem('docvault_wallet')
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            walletAddress={walletAddress}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />
        }
      />

      <Route
        path="/home"
        element={
          <Home
            walletAddress={walletAddress}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
          />
        }
      />

      <Route
        path="/dashboard"
        element={
          token && walletAddress ? (
            <Dashboard
              token={token}
              walletAddress={walletAddress}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  )
}