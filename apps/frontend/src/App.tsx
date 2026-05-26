import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Home from '@/pages/Home'
import { Dashboard } from '@/pages/Dashboard'
import { ProfilePage } from '@/pages/ProfilePage'
import { Header } from '@/components/common/Header'
import { Footer } from '@/components/common/Footer'

import { fetchNonce, verifySignature, getProfile, updateProfile } from '@/lib/api'
import { ethers } from 'ethers'

export default function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('docvault_token')
  )

  const [walletAddress, setWalletAddress] = useState<string | null>(
    localStorage.getItem('docvault_wallet')
  )

  const [profile, setProfile] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<'home' | 'profile' | 'settings' | 'dashboard'>('home')

  useEffect(() => {
    if (token && walletAddress) {
      loadProfile()
    }
  }, [token, walletAddress])

  const loadProfile = async () => {
    if (!token) return
    try {
      const data = await getProfile(token)
      setProfile(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
  }

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

      setCurrentPage('home')

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
    setProfile(null)
    setCurrentPage('home')

    localStorage.removeItem('docvault_token')
    localStorage.removeItem('docvault_wallet')
  }

  const handleNavigate = (page: 'profile' | 'settings') => {
    setCurrentPage(page)
  }

  const handleUpdateProfile = async (data: any) => {
    if (!token) return
    try {
      await updateProfile(token, {
        display_name: data.displayName,
        bio: data.bio,
        twitter_url: data.twitterUrl,
        github_url: data.githubUrl,
        website_url: data.websiteUrl,
        is_profile_public: data.isProfilePublic,
      })
      await loadProfile()
      alert('Cập nhật hồ sơ thành công!')
    } catch (err) {
      console.error('Update profile failed:', err)
      alert('Cập nhật thất bại!')
    }
  }

  const handleUploadAvatar = async (file: File) => {
    if (!token) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('http://localhost:3000/auth/profile/avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error')
        throw new Error(`Upload failed (${res.status}): ${errText}`)
      }
      await loadProfile()
    } catch (err) {
      console.error('Avatar upload failed:', err)
      alert(`Tải ảnh đại diện thất bại: ${err}`)
    }
  }

  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard'

  const avatarUrl = profile?.avatarUrl || null
  const displayName = profile?.displayName || null
  const ensName = profile?.ensName || null

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {!isDashboard && (
        <Header
          walletAddress={walletAddress}
          avatarUrl={avatarUrl}
          displayName={displayName}
          ensName={ensName}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
          onNavigate={handleNavigate}
        />
      )}
      <main className="flex-1 w-full">
        {currentPage === 'profile' && token && walletAddress && profile ? (
          <ProfilePage
            profile={profile}
            onBack={() => setCurrentPage('home')}
            onUpdateProfile={handleUpdateProfile}
            onUploadAvatar={handleUploadAvatar}
            onDisconnect={disconnectWallet}
          />
        ) : (
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
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    ensName={ensName}
                    onNavigate={handleNavigate}
                    onDisconnect={disconnectWallet}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/profile"
              element={
                token && walletAddress && profile ? (
                  <ProfilePage
                    profile={profile}
                    onBack={() => setCurrentPage('home')}
                    onUpdateProfile={handleUpdateProfile}
                    onUploadAvatar={handleUploadAvatar}
                    onDisconnect={disconnectWallet}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      {currentPage !== 'profile' && <Footer />}
    </div>
  )
}