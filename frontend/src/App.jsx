import axios from 'axios'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, Navigate, Routes, Route } from 'react-router-dom'
import {
  ArrowDownCircle, ArrowUpCircle, Banknote, BookOpen, CalendarDays, CheckCircle2,
  Clock3, Edit3, FileSpreadsheet, FileText, Landmark, LayoutDashboard,
  Lock, LogOut, Menu, Plus, ReceiptText, RefreshCw, Search, Settings, Tags,
  Trash2, Upload, Users, WalletCards, ShoppingCart, Package, Printer, Cloud,
  Sliders, Image as ImageIcon, RotateCcw, FileImage, Wand2
} from 'lucide-react'
import './App.css'
import { CODEX_LOGO_MARK, CODEX_LOGO_FULL, APP_LOGO, CODEX_PLUS_LOGO } from './LogoConstant.js'
import BackupPanel from './Backup.jsx'
import SuperadminPanel from './Superadmin.jsx'

const ChartPanel = lazy(() => import('./ChartPanel.jsx'))
const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api')
const navItems = [
  ['Dashboard', LayoutDashboard], ['Transactions', BookOpen], ['Categories', Tags],
  ['Customers', Users], ['Vendors', Users], ['Sales', ShoppingCart], ['Stock', Package],
  ['Backup', Cloud], ['Settings', Settings],
]
const pageCopy = {
  Dashboard: 'Business overview, account balances, and recent money movement.',
  Backup: 'Securely backup and restore your business data to Google Drive.',
  Transactions: 'Record income and expenses, filter the ledger, and manage dues.',
  Categories: 'Organize income and expenses so reports stay easy to scan.',
  'Customers': 'Keep customers, vendors, staff, and other parties in one place.',
  'Vendors': 'Keep track of suppliers and vendor records.',
  Sales: 'Track product sales, record custom sales, and manage sales revenue.',
  Stock: 'Monitor inventory levels, view total, sold, and remaining stock.',
  Settings: 'Manage accounts, reminders, and admin access.',
  Superadmin: 'Manage all user accounts, active trials, and company plan statuses.',
}

function currency(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0))
}

const defaultInvoiceTemplate = {
  mode: 'standard', // 'standard' | 'letterhead' | 'stationery'
  companyName: 'Codex Plus',
  tagline: 'Accounts & Billing',
  phone: '',
  address: '',
  logo: '',
  logoHeight: 52, // customizable height in px (30px to 80px)
  showBrandText: true, // show company text next to logo or logo only
  letterheadImage: '',
  topPadding: 24,
  hideBranding: false,
  footerNote: 'Thank you for your business!',
  pageSize: 'A4', // 'A4' | 'A5' | 'Letter' | 'Legal' | 'Thermal80' | 'Thermal58' | 'custom'
  pageOrientation: 'portrait', // 'portrait' | 'landscape'
  customWidth: '210mm',
  customHeight: '297mm',
  pageMargin: '8mm'
}

function computePageSize(settings) {
  const { pageSize = 'A4', pageOrientation = 'portrait', customWidth = '210mm', customHeight = '297mm' } = settings || {}
  if (pageSize === 'custom') {
    const w = customWidth ? customWidth.trim() : '210mm'
    const h = customHeight ? customHeight.trim() : '297mm'
    return `${w} ${h}`
  }
  if (pageSize === 'Thermal80') return '80mm auto'
  if (pageSize === 'Thermal58') return '58mm auto'
  return `${pageSize} ${pageOrientation || 'portrait'}`
}

function computePageMargin(settings) {
  const { pageSize = 'A4', pageMargin = '8mm' } = settings || {}
  if (pageSize === 'Thermal80' || pageSize === 'Thermal58') return '2mm'
  return pageMargin || '8mm'
}

function getPreviewMaxWidth(settings) {
  const { pageSize, pageOrientation, customWidth } = settings || {}
  if (pageSize === 'Thermal58') return '290px'
  if (pageSize === 'Thermal80') return '380px'
  if (pageSize === 'A5') return '540px'
  if (pageOrientation === 'landscape') return '920px'
  if (pageSize === 'custom' && customWidth) {
    if (customWidth.includes('mm')) {
      const mm = parseFloat(customWidth)
      if (!isNaN(mm)) {
        if (mm <= 65) return '290px'
        if (mm <= 90) return '380px'
        if (mm <= 160) return '540px'
      }
    }
  }
  return '740px'
}

function autoTrimCanvas(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return canvas
    const width = canvas.width
    const height = canvas.height
    if (width <= 10 || height <= 10) return canvas
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    const isTransparent = (idx) => data[idx + 3] < 25
    const isNearWhite = (idx) => data[idx] > 235 && data[idx + 1] > 235 && data[idx + 2] > 235

    // Build binary grid: 1 = content pixel, 0 = background
    const grid = new Uint8Array(width * height)
    let nonBgCount = 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        if (!isTransparent(idx) && !isNearWhite(idx)) {
          grid[y * width + x] = 1
          nonBgCount++
        }
      }
    }

    // If completely blank or virtually completely solid content, keep as is
    if (nonBgCount === 0 || nonBgCount > width * height * 0.98) {
      return canvas
    }

    // Connected components to find content islands and discard outer boundary/window frames
    const visited = new Uint8Array(width * height)
    const components = []

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = y * width + x
        if (grid[pos] === 1 && !visited[pos]) {
          const q = [x, y]
          visited[pos] = 1
          let minX = x, maxX = x, minY = y, maxY = y
          let count = 0
          let head = 0
          while (head < q.length) {
            const cx = q[head++]
            const cy = q[head++]
            count++
            if (cx < minX) minX = cx
            if (cx > maxX) maxX = cx
            if (cy < minY) minY = cy
            if (cy > maxY) maxY = cy
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue
                const nx = cx + dx, ny = cy + dy
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const npos = ny * width + nx
                  if (grid[npos] === 1 && !visited[npos]) {
                    visited[npos] = 1
                    q.push(nx, ny)
                  }
                }
              }
            }
          }
          const w = maxX - minX + 1
          const h = maxY - minY + 1
          components.push({
            count,
            minX, maxX, minY, maxY,
            w, h,
            touchesEdge: (minX === 0 || minY === 0 || maxX === width - 1 || maxY === height - 1)
          })
        }
      }
    }

    if (components.length === 0) return canvas

    // Filter out edge frame artifacts (e.g. 1-2px screenshot border lines or window borders)
    const validComponents = components.filter(c => {
      if (components.length > 1 && c.touchesEdge) {
        const bboxArea = c.w * c.h
        const density = c.count / bboxArea
        // Screenshot frame spanning across full width and height with hollow/low density
        if ((c.w >= width * 0.8 && c.h >= height * 0.8) && density < 0.25) {
          return false
        }
        // Thin 1-3px line hugging the edge
        if ((c.w <= 3 && c.h >= height * 0.4) || (c.h <= 3 && c.w >= width * 0.4)) {
          return false
        }
      }
      return true
    })

    const targetComps = validComponents.length > 0 ? validComponents : components

    let cropMinX = width, cropMinY = height, cropMaxX = 0, cropMaxY = 0
    for (const c of targetComps) {
      if (c.minX < cropMinX) cropMinX = c.minX
      if (c.maxX > cropMaxX) cropMaxX = c.maxX
      if (c.minY < cropMinY) cropMinY = c.minY
      if (c.maxY > cropMaxY) cropMaxY = c.maxY
    }

    // If bounding box already occupies full canvas, no crop needed
    if (cropMinX <= 2 && cropMinY <= 2 && cropMaxX >= width - 3 && cropMaxY >= height - 3) {
      return canvas
    }

    // Add 2% - 4% clean breathing space around the detected logo
    const padX = Math.max(3, Math.round((cropMaxX - cropMinX) * 0.03))
    const padY = Math.max(3, Math.round((cropMaxY - cropMinY) * 0.03))
    const cropX = Math.max(0, cropMinX - padX)
    const cropY = Math.max(0, cropMinY - padY)
    const cropW = Math.min(width - cropX, (cropMaxX - cropMinX) + padX * 2)
    const cropH = Math.min(height - cropY, (cropMaxY - cropMinY) + padY * 2)

    if (cropW <= 0 || cropH <= 0) return canvas

    const trimmed = document.createElement('canvas')
    trimmed.width = cropW
    trimmed.height = cropH
    const tCtx = trimmed.getContext('2d')
    tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    return trimmed
  } catch (err) {
    console.warn('AutoTrim failed, keeping original:', err)
    return canvas
  }
}

function autoTrimDataUrl(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve('')
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => resolve(dataUrl)
    img.onload = () => {
      try {
        let canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const trimmed = autoTrimCanvas(canvas)
        const isPng = dataUrl.startsWith('data:image/png')
        resolve(trimmed.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92))
      } catch {
        resolve(dataUrl)
      }
    }
    img.src = dataUrl
  })
}

function processImageUpload(file, maxWidth = 1600, maxHeight = 2200, shouldTrim = false) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected'))
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new window.Image()
      img.onerror = reject
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        let canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        if (shouldTrim) {
          canvas = autoTrimCanvas(canvas)
        }

        const isPng = file.type === 'image/png'
        const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.90)
        resolve(dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

let csrfTokenCached = '';

async function prepareCsrf() {
  const response = await axios.get(`${apiBase}/auth/csrf/`, { withCredentials: true })
  if (response.data && response.data.csrfToken) {
    csrfTokenCached = response.data.csrfToken;
  }
}

function emptyTransaction(type = 'income') {
  return { transaction_type: type, title: '', amount: '', category: '', account: '', party: '', payment_method: 'cash', reference_number: '', notes: '', date: new Date().toISOString().slice(0, 10), attachment: null }
}

function formatLabel(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function openAttachment(urlOrBase64) {
  if (!urlOrBase64) return
  if (urlOrBase64.startsWith('data:')) {
    try {
      const parts = urlOrBase64.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const rawLength = raw.length
      const uInt8Array = new Uint8Array(rawLength)
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
    } catch (e) {
      console.error(e)
      window.open(urlOrBase64, '_blank')
    }
  } else {
    window.open(urlOrBase64, '_blank')
  }
}

const themePresets = {
  original: {
    '--primary-color': '#000000',
    '--primary-hover': '#1f2937',
    '--primary-text': '#ffffff',
    '--bg-color': '#f4f4f5',
    '--text-color': '#18181b',
    '--sidebar-bg': '#000000',
    '--sidebar-text': '#f4f4f5',
    '--sidebar-hover': '#18181b',
    '--sidebar-border': 'rgba(255, 255, 255, 0.1)',
    '--panel-bg': '#ffffff',
    '--panel-border': '1px solid #e4e4e7',
    '--panel-radius': '12px',
    '--panel-shadow': '0 8px 30px rgba(0, 0, 0, 0.03)',
    '--card-glow': 'none',
    '--row-hover': '#f4f4f5',
    '--pill-bg': '#e4e4e7',
  },
  glassmorphism: {
    '--primary-color': '#6366f1',
    '--primary-hover': '#4f46e5',
    '--primary-text': '#ffffff',
    '--bg-color': 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
    '--text-color': '#1e1b4b',
    '--sidebar-bg': 'rgba(15, 23, 42, 0.85)',
    '--sidebar-text': '#f8fafc',
    '--sidebar-hover': 'rgba(255, 255, 255, 0.1)',
    '--sidebar-border': 'rgba(255, 255, 255, 0.15)',
    '--panel-bg': 'rgba(255, 255, 255, 0.45)',
    '--panel-border': '1px solid rgba(255, 255, 255, 0.4)',
    '--panel-radius': '16px',
    '--panel-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    '--card-glow': 'inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
    '--row-hover': 'rgba(255, 255, 255, 0.15)',
    '--pill-bg': 'rgba(255, 255, 255, 0.25)',
  },
  dark: {
    '--primary-color': '#14b8a6',
    '--primary-hover': '#0d9488',
    '--primary-text': '#0b0f19',
    '--bg-color': '#0b0f19',
    '--text-color': '#f3f4f6',
    '--sidebar-bg': '#111827',
    '--sidebar-text': '#f3f4f6',
    '--sidebar-hover': '#1f2937',
    '--sidebar-border': '#1f2937',
    '--panel-bg': '#161e2e',
    '--panel-border': '1px solid #243048',
    '--panel-radius': '10px',
    '--panel-shadow': '0 4px 20px rgba(0, 0, 0, 0.3)',
    '--card-glow': 'none',
    '--row-hover': '#1f2937',
    '--pill-bg': '#243048',
  },
  brutalism: {
    '--primary-color': '#facc15',
    '--primary-hover': '#eab308',
    '--primary-text': '#000000',
    '--bg-color': '#cbd5e1',
    '--text-color': '#000000',
    '--sidebar-bg': '#f3f4f6',
    '--sidebar-text': '#000000',
    '--sidebar-hover': '#e5e7eb',
    '--sidebar-border': '3px solid #000000',
    '--panel-bg': '#ffffff',
    '--panel-border': '3px solid #000000',
    '--panel-radius': '0px',
    '--panel-shadow': '5px 5px 0px #000000',
    '--card-glow': 'none',
    '--row-hover': '#e5e7eb',
    '--pill-bg': '#ffffff',
  },
  cyberpunk: {
    '--primary-color': '#ff007f',
    '--primary-hover': '#d00068',
    '--primary-text': '#ffffff',
    '--bg-color': '#05050a',
    '--text-color': '#00ffff',
    '--sidebar-bg': '#09090f',
    '--sidebar-text': '#ff007f',
    '--sidebar-hover': '#161622',
    '--sidebar-border': '1px solid #ff007f',
    '--panel-bg': '#0d0d18',
    '--panel-border': '1px solid #00ffff',
    '--panel-radius': '4px',
    '--panel-shadow': '0 0 10px rgba(0, 255, 255, 0.25)',
    '--card-glow': '0 0 5px rgba(255, 0, 127, 0.2)',
    '--row-hover': '#161622',
    '--pill-bg': 'rgba(0, 255, 255, 0.15)',
  },
  pastel: {
    '--primary-color': '#fda4af',
    '--primary-hover': '#f43f5e',
    '--primary-text': '#4c0519',
    '--bg-color': '#fafaf9',
    '--text-color': '#44403c',
    '--sidebar-bg': '#f5f5f4',
    '--sidebar-text': '#44403c',
    '--sidebar-hover': '#e7e5e4',
    '--sidebar-border': '1px solid #e7e5e4',
    '--panel-bg': '#fffbeb',
    '--panel-border': '1px solid #f5f5f4',
    '--panel-radius': '20px',
    '--panel-shadow': '0 10px 20px rgba(120, 113, 108, 0.04)',
    '--card-glow': 'none',
    '--row-hover': '#e7e5e4',
    '--pill-bg': '#fae8ff',
  }
}

export default function App() {
  const [auth, setAuth] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [checkingSession, setCheckingSession] = useState(true)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ business_name: '', owner_name: '', email: '', phone: '', password: '', address: '' })
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [message, setMessage] = useState('')
  const [partyHistory, setPartyHistory] = useState(null)

  // Routing Logic
  const path = location.pathname;
  let active = 'Dashboard';
  if (path.startsWith('/app/')) {
    const segment = path.split('/app/')[1] || '';
    const mapped = {
      'dashboard': 'Dashboard',
      'transactions': 'Transactions',
      'categories': 'Categories',
      'parties': 'Customers',
      'vendors': 'Vendors',
      'sales': 'Sales',
      'stock': 'Stock',
      'backup': 'Backup',
      'settings': 'Settings'
    }[segment.split('/')[0]];
    if (mapped) active = mapped;
  } else if (path.startsWith('/superadmin')) {
    active = 'Superadmin';
  }

  function handleNavigation(page) {
    if (page === 'Superadmin') {
      navigate('/superadmin');
    } else if (page === 'Customers') {
      navigate('/app/parties');
    } else {
      navigate(`/app/${page.toLowerCase()}`);
    }
  }


  const getThemeKey = (key) => {
    const uid = localStorage.getItem('userId') || 'default';
    return `${key}_${uid}`;
  };

  const [themeStyle, setThemeStyle] = useState(() => localStorage.getItem(getThemeKey('themeStyle')) || 'original')
  const [customColors, setCustomColors] = useState(() => {
    try {
      const saved = localStorage.getItem(getThemeKey('customColors'))
      return saved ? JSON.parse(saved) : { primary: '', bg: '', text: '', sidebarBg: '', sidebarText: '', panelBg: '' }
    } catch {
      return { primary: '', bg: '', text: '', sidebarBg: '', sidebarText: '', panelBg: '' }
    }
  })

  // OAuth Redirect Handling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected) {
      handleNavigation('Backup');
      window.history.replaceState({}, "", "/");

      if (connected === 'false' && error) {
        setTimeout(() => alert(`Google Drive Connection Failed\n\nReason: ${error}`), 500);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(getThemeKey('themeStyle'), themeStyle)
  }, [themeStyle])

  useEffect(() => {
    localStorage.setItem(getThemeKey('customColors'), JSON.stringify(customColors))
  }, [customColors])

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeStyle(localStorage.getItem(getThemeKey('themeStyle')) || 'original')
      try {
        const saved = localStorage.getItem(getThemeKey('customColors'))
        setCustomColors(saved ? JSON.parse(saved) : { primary: '', bg: '', text: '', sidebarBg: '', sidebarText: '', panelBg: '' })
      } catch {
        setCustomColors({ primary: '', bg: '', text: '', sidebarBg: '', sidebarText: '', panelBg: '' })
      }
    }
    window.addEventListener('themeChanged', handleThemeChange)
    return () => window.removeEventListener('themeChanged', handleThemeChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const preset = (auth && themePresets[themeStyle]) ? themePresets[themeStyle] : themePresets.original

    // Apply presets
    Object.entries(preset).forEach(([key, val]) => {
      root.style.setProperty(key, val)
    })

    // Apply custom overrides
    if (auth && customColors.primary) {
      root.style.setProperty('--primary-color', customColors.primary)
      root.style.setProperty('--primary-hover', customColors.primary + 'e6')
    } else {
      root.style.removeProperty('--primary-hover')
    }
    if (auth && customColors.bg) {
      root.style.setProperty('--bg-color', customColors.bg)
    }
    if (auth && customColors.panelBg) {
      root.style.setProperty('--panel-bg', customColors.panelBg)
    }
    if (auth && customColors.text) {
      root.style.setProperty('--text-color', customColors.text)
    }
    if (auth && customColors.sidebarBg) {
      root.style.setProperty('--sidebar-bg', customColors.sidebarBg)
      root.style.setProperty('--sidebar-hover', customColors.sidebarBg + 'cc')
    } else {
      root.style.removeProperty('--sidebar-hover')
    }
    if (auth && customColors.sidebarText) {
      root.style.setProperty('--sidebar-text', customColors.sidebarText)
    }
  }, [themeStyle, customColors, auth])

  const [data, setData] = useState({ dashboard: null, reports: null, accounts: [], categories: [], parties: [], transactions: [], dues: [], notes: [], sales: [], stock: [] })
  const [loaded, setLoaded] = useState({ refs: false, Dashboard: false, Transactions: false, Categories: false, 'Customers': false, 'Vendors': false, Settings: false, Sales: false, Stock: false })
  const [filters, setFilters] = useState({ keyword: '', category: '', payment_method: '', start: '', end: '', min_amount: '', max_amount: '' })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [txForm, setTxForm] = useState(emptyTransaction())
  const [editingTx, setEditingTx] = useState(null)

  const api = useMemo(() => {
    let deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      // Create a unique Device ID for this browser
      deviceId = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
      localStorage.setItem('deviceId', deviceId)
    }

    const instance = axios.create({ baseURL: apiBase, withCredentials: true })
    instance.interceptors.request.use((config) => {
      let token = csrfTokenCached;
      if (!token) {
        const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)
        if (match) token = match[1]
      }
      if (token) config.headers['X-CSRFToken'] = token

      // Attach Device ID to all requests
      config.headers['X-Device-Id'] = deviceId

      const jwtToken = localStorage.getItem('jwt_token')
      if (jwtToken) {
        config.headers.Authorization = `Bearer ${jwtToken}`
      }
      return config
    })
    return instance
  }, [])
  const incomeCategories = useMemo(() => data.categories.filter((c) => c.category_type === 'income'), [data.categories])
  const expenseCategories = useMemo(() => data.categories.filter((c) => c.category_type === 'expense'), [data.categories])
  const activeCategories = txForm.transaction_type === 'income' ? incomeCategories : expenseCategories

  const filteredNavItems = useMemo(() => {
    if (auth?.is_portal_admin || auth?.role?.toUpperCase() === 'SUPERADMIN') {
      return [['Superadmin', Lock]]
    }
    return navItems
  }, [auth])

  useEffect(() => {
    if (!txForm.account && data.accounts.length === 1) {
      setTxForm((form) => ({ ...form, account: String(data.accounts[0].id) }))
    }
  }, [data.accounts, txForm.account])

  useEffect(() => {
    if (!txForm.category && activeCategories.length === 1) {
      setTxForm((form) => ({ ...form, category: String(activeCategories[0].id) }))
    }
  }, [activeCategories, txForm.category])

  const mergeData = useCallback((updates) => {
    setData((current) => ({ ...current, ...updates }))
  }, [])

  const loadReferenceData = useCallback(async (force = false) => {
    if (!auth || (loaded.refs && !force)) return
    const [accounts, categories, parties] = await Promise.all([
      api.get('/accounts/'),
      api.get('/categories/'),
      api.get('/parties/'),
    ])
    mergeData({ accounts: accounts.data, categories: categories.data, parties: parties.data })
    setLoaded((current) => ({ ...current, refs: true }))
  }, [api, auth, loaded.refs, mergeData])

  const loadActivePage = useCallback(async (force = false) => {
    if (!auth) return
    if (loaded[active] && !force) return
    setLoading(true)
    try {
      const query = new URLSearchParams(Object.entries(appliedFilters).filter(([, v]) => v)).toString()
      if (active === 'Dashboard') {
        const [dashboard, reports] = await Promise.all([
          api.get('/dashboard/'),
          api.get(`/reports/${query ? `?${query}` : ''}`),
        ])
        mergeData({ dashboard: dashboard.data, reports: reports.data })
      }
      if (active === 'Transactions') {
        await loadReferenceData()
        const [transactions, dues] = await Promise.all([
          api.get(`/transactions/${query ? `?${query}` : ''}`),
          api.get('/dues/'),
        ])
        mergeData({ transactions: transactions.data, dues: dues.data })
      }
      if (active === 'Categories') {
        const categories = await api.get('/categories/')
        mergeData({ categories: categories.data })
      }
      if (active === 'Customers' || active === 'Vendors') {
        const parties = await api.get('/parties/')
        mergeData({ parties: parties.data })
      }
      if (active === 'Settings') {
        const [accounts, notes] = await Promise.all([api.get('/accounts/'), api.get('/notes/')])
        mergeData({ accounts: accounts.data, notes: notes.data })
      }
      if (active === 'Sales') {
        await loadReferenceData()
        const [sales, stock] = await Promise.all([api.get('/sales/'), api.get('/stock/')])
        mergeData({ sales: sales.data, stock: stock.data })
      }
      if (active === 'Stock') {
        const stock = await api.get('/stock/')
        mergeData({ stock: stock.data })
      }

      setLoaded((current) => ({ ...current, [active]: true }))
      setMessage('')
    } catch (error) {
      if (error.response?.status === 401) setAuth(null)
      setMessage(error.response?.data?.detail || 'Could not load data from backend. Please check server and login.')
    } finally {
      setLoading(false)
    }
  }, [active, api, auth, appliedFilters, loadReferenceData, loaded, mergeData])

  useEffect(() => {
    async function checkSession() {
      try {
        await prepareCsrf()

        // Only check session if token exists
        if (!localStorage.getItem('jwt_token')) {
          setAuth(null)
          setCheckingSession(false)
          return
        }

        const jwtToken = localStorage.getItem('jwt_token');
        const response = await axios.get(`${apiBase}/auth/me`, {
          withCredentials: true,
          headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}
        })
        if (response.data && response.data.is_authenticated === false) {
          setAuth(null)
        } else {
          setAuth(response.data)
          if (response.data.is_portal_admin) {
            setActive('Superadmin')
          }
          setMessage('')
        }
      } catch {
        setAuth(null)
      } finally {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [])


  useEffect(() => { loadActivePage() }, [loadActivePage])

  function applyFilters() {
    setAppliedFilters(filters)
    setLoaded((current) => ({ ...current, Dashboard: false, Transactions: false }))
  }

  async function login(event) {
    event.preventDefault()
    setIsLoggingIn(true)
    setMessage('')
    try {
      await prepareCsrf()
      const csrfToken = csrfTokenCached;

      const payload = { ...loginForm, username: loginForm.username.trim() };
      const response = await axios.post(`${apiBase}/auth/login`, payload, { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } })

      if (response.data.token) {
        localStorage.setItem('jwt_token', response.data.token)
        localStorage.setItem('userId', response.data.user?.id || 'default')
        window.dispatchEvent(new Event('themeChanged'))
      }

      setAuth(response.data.user || response.data)
      setLoginForm({ username: response.data.user?.username || response.data.username || '', password: '' })
      if (response.data.user?.role === 'SUPERADMIN' || response.data.user?.role === 'superadmin' || response.data.is_portal_admin) {
        navigate('/superadmin')
      } else {
        navigate('/app/dashboard')
      }
      setMessage('Login successful.')
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Invalid username or password. Please check your credentials.'
      setMessage(Array.isArray(msg) ? msg.join(' ') : msg)
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function register(event) {
    event.preventDefault()
    try {
      await prepareCsrf()
      const csrfToken = csrfTokenCached;

      // Transform payload for backend
      const payload = {
        username: registerForm.email, // backend expects username
        password: registerForm.password,
        businessName: registerForm.business_name,
        ownerName: registerForm.owner_name,
        phone: registerForm.phone
      };

      const response = await axios.post(`${apiBase}/auth/register`, payload, { withCredentials: true, headers: { 'X-CSRFToken': csrfToken } })
      setRegisterForm({ business_name: '', owner_name: '', email: '', phone: '', password: '', address: '' })
      navigate('/login')
      setMessage(response.data?.detail || 'Registration successful! Please login.')
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Registration failed. Please check your inputs.'
      setMessage(Array.isArray(errorMsg) ? errorMsg.join(' ') : errorMsg)
    }
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => { })
    localStorage.removeItem('jwt_token')
    localStorage.removeItem('userId')
    setAuth(null)
    navigate('/login')
    setData({ dashboard: null, reports: null, accounts: [], categories: [], parties: [], transactions: [], dues: [], notes: [] })
    setLoaded({ refs: false, Dashboard: false, Transactions: false, Categories: false, 'Customers': false, 'Vendors': false, Settings: false })
    window.dispatchEvent(new Event('themeChanged'))
    setMessage('Logged out.')
  }

  async function saveTransaction(event) {
    event.preventDefault()
    await prepareCsrf()
    try {
      if (editingTx) await api.patch(`/transactions/${editingTx.id}/`, txForm)
      else await api.post('/transactions/', txForm)
      setTxForm(emptyTransaction(txForm.transaction_type))
      setEditingTx(null)
      setLoaded((current) => ({ ...current, Dashboard: false, Transactions: false }))
      await loadActivePage(true)
      setMessage('Transaction saved in backend.')
    } catch (error) {
      const d = error.response?.data;
      if (d && typeof d === 'object' && !d.detail) {
        setMessage(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | '));
      } else {
        setMessage(d?.detail || 'Transaction save failed. Check server.');
      }
    }
  }

  function editTransaction(tx) {
    setEditingTx(tx)
    setTxForm({ ...emptyTransaction(tx.transaction_type), ...tx, category: tx.category, account: tx.account, party: tx.party || '', attachment: tx.attachment })
    handleNavigation('Transactions')
  }

  async function remove(resource, id) {
    const confirmed = window.confirm('Are you sure you want to permanently delete this record?')
    if (!confirmed) return
    try {
      await prepareCsrf()
      await api.delete(`/${resource}/${id}/`)
      setLoaded((current) => ({ ...current, refs: false, Dashboard: false, Transactions: false, Categories: false, 'Customers': false, 'Vendors': false, Settings: false, Sales: false, Stock: false }))
      await loadActivePage(true)
      setMessage('Record deleted from backend.')
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Delete failed.')
    }
  }

  async function saveSimple(resource, payload) {
    try {
      await prepareCsrf()
      if (payload.id) {
        await api.patch(`/${resource}/${payload.id}/`, payload)
      } else {
        await api.post(`/${resource}/`, payload)
      }
      setLoaded((current) => ({ ...current, refs: false, Dashboard: false, Transactions: false, Categories: false, 'Customers': false, 'Vendors': false, Settings: false, Sales: false, Stock: false }))
      await loadActivePage(true)
      setMessage('Record saved in backend.')
    } catch (error) {
      const d = error.response?.data;
      if (d && typeof d === 'object' && !d.detail) {
        setMessage(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | '));
      } else {
        setMessage(d?.detail || 'Save failed.');
      }
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await prepareCsrf()
      await api.post('/auth/change-password/', { old_password: form.get('old_password'), new_password: form.get('new_password') })
      formElement.reset()
      setMessage('Password changed.')
    } catch (error) {
      const detail = error.response?.data?.detail
      setMessage(Array.isArray(detail) ? detail.join(' ') : detail || 'Password could not be changed.')
    }
  }


  async function downloadTransactionExport(type) {
    const query = new URLSearchParams(Object.entries(appliedFilters).filter(([, v]) => v)).toString()
    const response = await api.get(`/export/${type}/?${query}`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = type === 'excel' ? 'account-statement.xlsx' : 'account-statement.pdf'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function downloadSalesExport(type) {
    const response = await api.get(`/export-sales/${type}/`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = type === 'excel' ? 'sales-statement.xlsx' : 'sales-statement.pdf'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importTransactions(file) {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await prepareCsrf()
      await api.post('/import/transactions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setLoaded((current) => ({ ...current, Dashboard: false, Transactions: false }))
      await loadActivePage(true)
      setMessage('Transactions imported successfully.')
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Transactions import failed.')
    }
  }

  async function importSales(file) {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await prepareCsrf()
      await api.post('/import/sales/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setLoaded((current) => ({ ...current, Dashboard: false, Sales: false, Stock: false }))
      await loadActivePage(true)
      setMessage('Sales imported successfully.')
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Sales import failed.')
    }
  }

  async function downloadStockExport(type) {
    const response = await api.get(`/export-stock/${type}/`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = type === 'excel' ? 'stock-inventory.xlsx' : 'stock-inventory.pdf'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importStock(file) {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await prepareCsrf()
      await api.post('/import/stock/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setLoaded((current) => ({ ...current, Dashboard: false, Sales: false, Stock: false }))
      await loadActivePage(true)
      setMessage('Stock imported successfully.')
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Stock import failed.')
    }
  }

  async function loadPartyHistory(party) {
    try {
      setLoading(true);
      await prepareCsrf();
      const res = await api.get(`/parties/${party.id}/history`);
      setPartyHistory({ party, ...res.data });
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to load party history.');
    } finally {
      setLoading(false);
    }
  }


  const chartData = (data.reports?.by_date || []).reduce((rows, row) => {
    const label = String(row.date)
    const found = rows.find((item) => item.date === label) || { date: label, income: 0, expense: 0 }
    found[row.transaction_type] = Number(row.total)
    return rows.includes(found) ? rows : [...rows, found]
  }, [])
  const totals = data.dashboard?.totals || {}
  const pendingTotal = Number(totals.pending_payable || 0) + Number(totals.pending_receivable || 0)
  const accountSummaries = data.dashboard?.account_summaries || []

  if (checkingSession) return <main className="loginPage"><div className="loginBox"><p className="message">Checking secure session...</p></div></main>

  if (!auth) {
    if (path !== '/login' && path !== '/register') {
      return <Navigate to="/login" replace />
    }

    if (path === '/register') {
      return <main className="loginPage">
        <form className="loginBox" onSubmit={register}>
          <div className="brand center"><div className="brandMark"><img src={CODEX_LOGO_MARK} alt="CodexPlus Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} /></div><div><strong>CodexPlus</strong><span>Create Account</span></div></div>
          <input required value={registerForm.business_name} onChange={(e) => setRegisterForm({ ...registerForm, business_name: e.target.value })} placeholder="Company or Business Name" />
          <input required value={registerForm.owner_name} onChange={(e) => setRegisterForm({ ...registerForm, owner_name: e.target.value })} placeholder="Owner Name" />
          <input required type="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="Email Address" />
          <input required value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="Phone Number" />
          <input required type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="Set Password" />
          <textarea required value={registerForm.address || ''} onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })} placeholder="Shop / Office / Business Address" style={{ minHeight: '60px', padding: '10px 12px', border: '1px solid #d4d4d8', borderRadius: '8px', width: '100%', outline: 'none', background: '#ffffff', color: '#09090b', resize: 'none', fontSize: '15px' }} />
          <button className="primary"><Plus size={18} /> Create Account</button>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button type="button" className="textLinkButton" style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }} onClick={() => { navigate('/login'); setMessage(''); }}>
              Already have an account? Login
            </button>
          </div>
          {message && <p className="message">{message}</p>}
        </form>
      </main >
    }

    return <main className="loginPage">
      <form className="loginBox" onSubmit={login}>
        <div className="brand center"><div className="brandMark"><img src={CODEX_LOGO_MARK} alt="CodexPlus Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} /></div><div><strong>CodexPlus</strong><span>Admin Login</span></div></div>
        <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="Email, Username or Business Name" />
        <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Password" />
        <button className="primary" disabled={isLoggingIn}>
          <Lock size={18} /> {isLoggingIn ? 'Logging in...' : 'Login'}
        </button>
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button type="button" className="textLinkButton" style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }} onClick={() => { navigate('/register'); setMessage('') }}>
            Don't have an account? Create Account
          </button>
        </div>
        {message && <p className="message" style={{ color: message.includes('successful') ? '#16a34a' : '#ef4444', background: message.includes('successful') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.includes('successful') ? '#bbf7d0' : '#fecaca'}`, padding: '10px', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }}>{message}</p>}
      </form>
    </main>
  }

  // Redirect logged-in users away from auth pages
  if (auth && (path === '/login' || path === '/register' || path === '/')) {
    if (auth.is_portal_admin || auth.role === 'SUPERADMIN' || auth.role === 'superadmin') {
      return <Navigate to="/superadmin" replace />
    }
    return <Navigate to="/app/dashboard" replace />
  }

  // Enforce Role-based routing
  if (auth) {
    const isSuper = auth.is_portal_admin || auth.role === 'SUPERADMIN' || auth.role === 'superadmin';
    if (isSuper && !path.startsWith('/superadmin')) {
      return <Navigate to="/superadmin" replace />
    }
    if (!isSuper && path.startsWith('/superadmin')) {
      return <Navigate to="/app/dashboard" replace />
    }
  }

  return <div className="app">
    {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand">
        <div className="brandMark">
          {(auth?.appLogo || CODEX_LOGO_MARK) ? (
            <img src={auth?.appLogo || CODEX_LOGO_MARK} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
          ) : (
            <Landmark size={22} />
          )}
        </div>
        <div>
          <strong>{auth?.is_portal_admin ? 'Superadmin' : (auth?.company_name || 'CodexPlus')}</strong>
          <span style={{ textTransform: 'capitalize' }}>
            {auth?.is_portal_admin ? 'Superadmin Portal' : (auth?.role ? `${auth.role} Workspace` : 'Account Department')}
          </span>
        </div>
      </div>
      <nav>{filteredNavItems.map(([item, Icon]) => <button className={active === item ? 'active' : ''} key={item} onClick={() => { handleNavigation(item); setMenuOpen(false); }}><Icon size={18} /> {item}</button>)}</nav>

      <div style={{
        marginTop: 'auto',
        paddingTop: '16px',
        borderTop: '1px solid var(--sidebar-border)',
        fontSize: '11px',
        color: 'var(--sidebar-text)',
        opacity: '0.5',
        textAlign: 'center',
        lineHeight: '1.5'
      }}>
        <p style={{ margin: '0 0 6px 0' }}>App Developed and update by:</p>
        <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '12px', color: '#ffffff' }}>codexplus</p>
        <a href="https://codexplus.site/" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>https://codexplus.site/</a>
        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>Call us</p>
        <p style={{ margin: '0 0 8px 0' }}>+923253315524</p>
        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>Email us</p>
        <p style={{ margin: 0 }}>info@codexplus.site</p>
      </div>
    </aside>
    <main>
      <header className="topbar">
        <button className="iconButton" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"><Menu /></button>
        <div className="pageHeading">
          <h1>{active} {auth?.is_portal_admin ? '' : `| ${auth?.company_name || 'Workspace'}`}</h1>
          <span>{pageCopy[active]}</span>
        </div>
        <div className="topActions">
          <div className="headerStatus">
            {loading ? 'Syncing latest data...' : `Logged in as ${auth?.owner_name || auth?.username}`}
          </div>
          <button onClick={() => loadActivePage(true)} title="Refresh"><RefreshCw size={18} /></button>
          <button onClick={logout} title="Logout"><LogOut size={18} /></button>
        </div>
      </header>
      {message && <div className="notice">{message}</div>}

      {active === 'Dashboard' && <>
        <div className="dashboard-brand-header">
          <h2>{auth?.company_name || 'Workspace'} Ledger Dashboard</h2>
        </div>
        <section className="statsGrid">
          <Metric icon={WalletCards} label="Current balance" value={currency(totals.current_balance)} tone="blue" />
          <Metric icon={ArrowUpCircle} label="Total income" value={currency(totals.income)} tone="green" />
          <Metric icon={ArrowDownCircle} label="Total expense" value={currency(totals.expense)} tone="red" />
          <Metric icon={Clock3} label="Pending dues" value={currency(pendingTotal)} tone="amber" />
        </section>
        <section className="periodGrid">{Object.entries(data.dashboard?.periods || {}).map(([period, value]) => <div className="period" key={period}><span>{period}</span><strong>{currency(value.balance)}</strong></div>)}</section>
        <section className="contentGrid">
          <Panel title="Income vs Expense" icon={CalendarDays}><Suspense fallback={<p className="emptyState">Loading chart...</p>}><ChartPanel data={chartData} currency={currency} /></Suspense></Panel>
          <Panel title="Account balances" icon={Banknote}><AccountList accounts={accountSummaries} /></Panel>
        </section>
        <section className="dashboardReport">
          <Panel title="All accounts report" icon={WalletCards}><AccountReport accounts={accountSummaries} /></Panel>
          <Panel title="Pending and recent activity" icon={Clock3}><DashboardActivity dashboard={data.dashboard} /></Panel>
        </section>
      </>}

      {active === 'Transactions' && <>
        <section className="split">
          <Panel title={editingTx ? 'Edit transaction' : 'New income / expense'} icon={Plus}>
            <TransactionForm form={txForm} setForm={setTxForm} save={saveTransaction} accounts={data.accounts} categories={activeCategories} parties={data.parties} editing={editingTx} cancel={() => { setEditingTx(null); setTxForm(emptyTransaction()) }} />
          </Panel>
          <Ledger filters={filters} setFilters={setFilters} apply={applyFilters} transactions={data.transactions} categories={data.categories} edit={editTransaction} remove={(id) => remove('transactions', id)} exportTx={downloadTransactionExport} importTx={importTransactions} />
        </section>
        <section className="transactionDues">
          <DuesPanel dues={data.dues} parties={data.parties} save={saveSimple} remove={(id) => remove('dues', id)} />
        </section>
      </>}

      {active === 'Categories' && <CategoriesPanel categories={data.categories} save={saveSimple} remove={(id) => remove('categories', id)} />}
      {active === 'Customers' && <PartiesPanel parties={data.parties} save={saveSimple} remove={(id) => remove('parties', id)} viewHistory={loadPartyHistory} />}
      {active === 'Vendors' && <VendorsPanel parties={data.parties} save={saveSimple} remove={(id) => remove('parties', id)} viewHistory={loadPartyHistory} />}
      {active === 'Sales' && <SalesPanel sales={data.sales} stock={data.stock} accounts={data.accounts} save={saveSimple} remove={(id) => remove('sales', id)} exportSales={downloadSalesExport} importSales={importSales} />}
      {active === 'Stock' && <StockPanel stock={data.stock} save={saveSimple} remove={(id) => remove('stock', id)} exportStock={downloadStockExport} importStock={importStock} />}
      {active === 'Backup' && <BackupPanel />}
      {active === 'Superadmin' && (auth?.is_portal_admin || auth?.role?.toUpperCase() === 'SUPERADMIN') && <SuperadminPanel />}

      {active === 'Settings' && <SettingsPanel accounts={data.accounts} notes={data.notes} save={saveSimple} remove={remove} changePassword={changePassword} themeStyle={themeStyle} setThemeStyle={setThemeStyle} customColors={customColors} setCustomColors={setCustomColors} />}

      {partyHistory && (
        <div className="modalOverlay" onClick={() => setPartyHistory(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()} style={{ width: '80%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--panel-bg)', padding: '20px', borderRadius: 'var(--panel-radius)', boxShadow: 'var(--panel-shadow)', color: 'var(--text-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>History for {partyHistory.party.name}</h2>
              <button onClick={() => setPartyHistory(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-color)' }}>&times;</button>
            </div>

            {partyHistory.sales && partyHistory.sales.length > 0 && (
              <>
                <h3>Sales History</h3>
                <div className="tableWrap" style={{ marginBottom: '20px' }}>
                  <table>
                    <thead><tr><th>Date</th><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                      {partyHistory.sales.map(s => (
                        <tr key={s.id}>
                          <td>{new Date(s.date).toLocaleDateString()}</td>
                          <td><strong>{s.stock_name}</strong></td>
                          <td>{s.quantity}</td>
                          <td>{currency(s.salePrice)}</td>
                          <td className="positive">+{currency(s.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {partyHistory.suppliedStock && partyHistory.suppliedStock.length > 0 && (
              <>
                <h3>Stock Supplied</h3>
                <div className="tableWrap" style={{ marginBottom: '20px' }}>
                  <table>
                    <thead><tr><th>Date</th><th>Item</th><th>Quantity</th><th>Unit Price</th></tr></thead>
                    <tbody>
                      {partyHistory.suppliedStock.map(s => (
                        <tr key={s.id}>
                          <td>{new Date(s.date).toLocaleDateString()}</td>
                          <td><strong>{s.name}</strong></td>
                          <td>{s.quantity}</td>
                          <td>{currency(s.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <h3>Transactions</h3>
            {partyHistory.transactions.length ? (
              <div className="tableWrap" style={{ marginBottom: '20px' }}>
                <table>
                  <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th></tr></thead>
                  <tbody>
                    {partyHistory.transactions.map(t => (
                      <tr key={t.id}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td>{t.title}</td>
                        <td><span className="pill">{t.category_name}</span></td>
                        <td className={t.transaction_type === 'income' ? 'positive' : 'negative'}>
                          {t.transaction_type === 'income' ? '+' : '-'}{currency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>No transactions found for this party.</p>}

            <h3>Dues</h3>
            {partyHistory.dues.length ? (
              <div className="tableWrap">
                <table>
                  <thead><tr><th>Due Date</th><th>Title</th><th>Type</th><th>Status</th><th>Amount</th></tr></thead>
                  <tbody>
                    {partyHistory.dues.map(d => (
                      <tr key={d.id}>
                        <td>{new Date(d.due_date).toLocaleDateString()}</td>
                        <td>{d.title}</td>
                        <td>{formatLabel(d.due_type)}</td>
                        <td><span className="pill">{formatLabel(d.status)}</span></td>
                        <td>{currency(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ fontSize: '14px', color: '#64748b' }}>No dues found for this party.</p>}
          </div>
        </div>
      )}
    </main>
  </div>
}

function Metric({ icon: Icon, label, value, tone }) { return <div className={`metric ${tone}`}><div className="metricIcon"><Icon /></div><span>{label}</span><strong>{value}</strong></div> }
function Panel({ title, icon: Icon, children, actions = null }) { return <section className="panel"><div className="panelTitle"><div><Icon size={19} /><h2>{title}</h2></div>{actions}</div>{children}</section> }
function EmptyState({ title, body }) { return <div className="emptyState"><strong>{title}</strong><span>{body}</span></div> }
function Field({ label, children, wide = false }) { return <label className={wide ? 'field wide' : 'field'}><span>{label}</span>{children}</label> }
function IconButton({ children, tone = '', ...props }) { return <button className={`rowAction ${tone}`} type="button" {...props}>{children}</button> }
function AccountList({ accounts }) {
  if (!accounts.length) return <EmptyState title="No accounts yet" body="Add an account from Settings to start tracking balances." />
  return <div className="accountList">{accounts.map((a) => <div key={a.id}><span>{a.name}<small>{formatLabel(a.account_type)} account - opening {currency(a.opening_balance)}</small></span><strong>{currency(a.current_balance)}</strong></div>)}</div>
}

function AccountReport({ accounts }) {
  if (!accounts.length) return <EmptyState title="No account report" body="Account totals will appear here after accounts are created." />
  return <div className="tableWrap"><table className="accountReportTable"><thead><tr><th>Account</th><th>Type</th><th>Opening</th><th>Income</th><th>Expense</th><th>Current Balance</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong></td><td><span className="pill">{formatLabel(account.account_type)}</span></td><td>{currency(account.opening_balance)}</td><td className="positive">{currency(account.income)}</td><td className="negative">{currency(account.expense)}</td><td><strong>{currency(account.current_balance)}</strong></td></tr>)}</tbody></table></div>
}

function DashboardActivity({ dashboard }) {
  const dues = dashboard?.pending_dues || []
  const transactions = dashboard?.recent_transactions || []
  return <div className="activityGrid"><div><h3>Pending payments</h3>{dues.length ? dues.map((due) => <p key={due.id}><strong>{due.title}</strong><span>{formatLabel(due.due_type)} - {currency(due.amount)} - {due.due_date}</span></p>) : <EmptyState title="No pending dues" body="Payables and receivables will show here." />}</div><div><h3>Recent ledger</h3>{transactions.length ? transactions.map((tx) => <p key={tx.id}><strong>{tx.title}</strong><span>{formatLabel(tx.transaction_type)} - {tx.account_name} - {currency(tx.amount)}</span></p>) : <EmptyState title="No recent transactions" body="New entries will appear in this activity list." />}</div></div>
}

function TransactionForm({ form, setForm, save, accounts, categories, parties, editing, cancel }) {
  return <form className="entryForm" onSubmit={save}>
    <div className="segmented">
      {['income', 'expense'].map((type) => <button className={form.transaction_type === type ? 'active' : ''} key={type} type="button" onClick={() => setForm({ ...form, transaction_type: type, category: '' })}>{formatLabel(type)}</button>)}
    </div>
    <Field label="Title"><input required placeholder="Source, vendor, or detail" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
    <div className="formTwo">
      <Field label="Amount"><input required type="number" step="any" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
      <Field label="Date"><input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
    </div>
    <Field label="Category"><select required value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="" disabled>{categories.length ? 'Select category' : 'No category available'}</option>{categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select>{categories.length === 0 && <small className="fieldHint">Create this type of category from Categories page.</small>}</Field>
    <Field label="Account"><select required value={form.account || ''} onChange={(e) => setForm({ ...form, account: e.target.value })}><option value="" disabled>{accounts.length ? 'Select account' : 'No account available'}</option>{accounts.map((a) => <option value={a.id} key={a.id}>{a.name}</option>)}</select>{accounts.length === 1 && <small className="fieldHint">Only one account found, selected automatically.</small>}{accounts.length === 0 && <small className="fieldHint">Create an account from Settings page first.</small>}</Field>
    <div className="formTwo">
      <Field label="Payment"><select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="cash">Cash</option><option value="bank">Bank</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option><option value="cheque">Cheque</option></select></Field>
      <Field label="Party"><select value={form.party || ''} onChange={(e) => setForm({ ...form, party: e.target.value })}><option value="">No party</option>{parties.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></Field>
    </div>
    <Field label="Reference"><input placeholder="Invoice or payment reference" value={form.reference_number || ''} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></Field>
    <Field label="Notes"><textarea placeholder="Optional details" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginBottom: '8px' }}>
      <label className="upload">
        <Upload size={18} />
        <span>{form.attachment ? (form.attachment.startsWith('data:') ? 'New file selected' : 'Existing receipt uploaded') : 'Receipt / invoice upload'}</span>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setForm({ ...form, attachment: reader.result });
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </label>
      {form.attachment && (
        <button
          type="button"
          onClick={() => setForm({ ...form, attachment: null })}
          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', textAlign: 'left', cursor: 'pointer', padding: '0', display: 'block', width: 'fit-content' }}
        >
          Remove attachment
        </button>
      )}
    </div>
    <div className="formActions"><button className="primary"><CheckCircle2 size={18} /> {editing ? 'Update entry' : 'Save entry'}</button>{editing && <button type="button" onClick={cancel}>Cancel</button>}</div>
  </form>
}

function Ledger({ filters, setFilters, apply, transactions, categories, edit, remove, exportTx, importTx }) {
  const totalCredit = transactions.reduce((sum, tx) => sum + (tx.transaction_type === 'income' ? Number(tx.amount) : 0), 0)
  const totalDebit = transactions.reduce((sum, tx) => sum + (tx.transaction_type === 'expense' ? Number(tx.amount) : 0), 0)
  return <Panel title="Ledger / account book" icon={ReceiptText} actions={<span className="panelMeta">{transactions.length} entries</span>}>
    <div className="ledgerSummary"><span>Debit <strong className="negative">{currency(totalDebit)}</strong></span><span>Credit <strong className="positive">{currency(totalCredit)}</strong></span><span>Net <strong>{currency(totalCredit - totalDebit)}</strong></span></div>
    <div className="filters">
      <label className="searchField"><Search size={16} /><input placeholder="Search title, notes, party" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} /></label>
      <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option>{categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select>
      <select value={filters.payment_method} onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}><option value="">All methods</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option></select>
      <input aria-label="Start date" type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} /><input aria-label="End date" type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
      <button className="primary" onClick={apply}>Apply</button>
    </div>
    <div className="exportGrid">
      <button type="button" className="btnExcelExport" onClick={() => exportTx('excel')}><FileSpreadsheet size={16} /> Excel export</button>
      <button type="button" className="btnPdfExport" onClick={() => exportTx('pdf')}><FileText size={16} /> PDF report</button>
      <label className="importLabel">
        <Upload size={16} /> Import Excel
        <input type="file" accept=".xlsx" onChange={(e) => { importTx(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
      </label>
    </div>
    {transactions.length ? <div className="tableWrap"><table><thead><tr><th>Date</th><th>Details</th><th>Category</th><th>Debit</th><th>Credit</th><th>Proof</th><th>Action</th></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id}><td>{tx.date}</td><td><strong>{tx.title}</strong><small>{tx.party_name || 'No party'}{tx.reference_number ? ` - ${tx.reference_number}` : ''}</small></td><td><span className="pill">{tx.category_name}</span></td><td className="negative">{tx.transaction_type === 'expense' ? currency(tx.amount) : '-'}</td><td className="positive">{tx.transaction_type === 'income' ? currency(tx.amount) : '-'}</td><td>{tx.attachment ? <button type="button" className="textLinkButton" onClick={() => openAttachment(tx.attachment)} style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', textDecoration: 'underline', padding: '0', fontSize: 'inherit', fontWeight: 'bold' }}>Open</button> : '-'}</td><td><div className="rowActions"><IconButton onClick={() => edit(tx)}><Edit3 size={15} /></IconButton><IconButton tone="danger" onClick={() => remove(tx.id)}><Trash2 size={15} /></IconButton></div></td></tr>)}</tbody></table></div> : <EmptyState title="No transactions found" body="Add a new entry or adjust filters to see ledger records." />}
  </Panel>
}

function CategoriesPanel({ categories, save, remove }) {
  const [form, setForm] = useState({ name: '', category_type: 'income', color: '#2563eb' })
  return <Panel title="Categories management" icon={Tags} actions={<span className="panelMeta">{categories.length} categories</span>}><form className="inlineForm" onSubmit={(e) => { e.preventDefault(); save('categories', form); setForm({ ...form, name: '' }) }}><Field label="Category name"><input required placeholder="Rent, Sales, Utilities" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Type"><select value={form.category_type} onChange={(e) => setForm({ ...form, category_type: e.target.value })}><option value="income">Income</option><option value="expense">Expense</option></select></Field><Field label="Color"><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field><button className="primary">Add category</button></form><SimpleRows emptyTitle="No categories yet" emptyBody="Create income and expense categories to make reports useful." rows={categories.map((c) => [c.id, c.name, formatLabel(c.category_type), c.color])} remove={remove} /></Panel>
}

function PartiesPanel({ parties, save, remove, viewHistory }) {
  const [form, setForm] = useState({ name: '', party_type: 'customer', phone: '', email: '', address: '', notes: '' });
  const [search, setSearch] = useState('');

  const customers = parties.filter(p => p.party_type === 'customer' && p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Panel title="Customer records" icon={Users} actions={<span className="panelMeta">{customers.length} records</span>}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Search size={18} style={{ color: 'var(--text-color)' }} />
        <input
          type="text"
          placeholder="Search customers by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '10px', width: '100%', maxWidth: '400px', borderRadius: 'var(--panel-radius)', border: 'var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
        />
      </div>
      <form className="inlineForm partiesForm" onSubmit={(e) => { e.preventDefault(); save('parties', { ...form, party_type: 'customer' }); setForm({ ...form, name: '', phone: '', email: '', address: '' }) }}>
        <Field label="Customer Name"><input required placeholder="Enter customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Type"><select value="customer" disabled><option value="customer">Customer</option></select></Field>
        <Field label="Phone"><input placeholder="03xx..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Address"><input placeholder="Karachi, Lahore, etc." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <button className="primary">Add customer</button>
      </form>
      <SimpleRows
        emptyTitle="No customers yet"
        emptyBody="Customers added from sales will appear here."
        rows={customers.map((p) => [p.id, p.name, formatLabel(p.party_type), p.phone, p.address])}
        remove={remove}
        customAction={{ icon: BookOpen, fn: (id) => viewHistory(parties.find(x => x.id === id)) }}
      />
    </Panel>
  );
}

function VendorsPanel({ parties, save, remove, viewHistory }) {
  const [form, setForm] = useState({ name: '', party_type: 'vendor', phone: '', email: '', address: '', notes: '' });
  const [search, setSearch] = useState('');

  const vendors = parties.filter(p => p.party_type === 'vendor' && p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Panel title="Vendor records" icon={Users} actions={<span className="panelMeta">{vendors.length} records</span>}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Search size={18} style={{ color: 'var(--text-color)' }} />
        <input
          type="text"
          placeholder="Search vendors by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '10px', width: '100%', maxWidth: '400px', borderRadius: 'var(--panel-radius)', border: 'var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
        />
      </div>
      <form className="inlineForm partiesForm" onSubmit={(e) => { e.preventDefault(); save('parties', { ...form, party_type: 'vendor' }); setForm({ ...form, name: '', phone: '', email: '', address: '' }) }}>
        <Field label="Vendor Name"><input required placeholder="Enter vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Type"><select value="vendor" disabled><option value="vendor">Vendor</option></select></Field>
        <Field label="Phone"><input placeholder="03xx..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Address"><input placeholder="Karachi, Lahore, etc." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <button className="primary">Add vendor</button>
      </form>
      <SimpleRows
        emptyTitle="No vendors yet"
        emptyBody="Vendors added from stock will appear here."
        rows={vendors.map((p) => [p.id, p.name, formatLabel(p.party_type), p.phone, p.address])}
        remove={remove}
        customAction={{ icon: BookOpen, fn: (id) => viewHistory(parties.find(x => x.id === id)) }}
      />
    </Panel>
  );
}

function DuesPanel({ dues, parties, save, remove }) {
  const [form, setForm] = useState({ title: '', due_type: 'payable', amount: '', due_date: new Date().toISOString().slice(0, 10), status: 'pending', party: '' })
  return <Panel title="Due payments" icon={Clock3} actions={<span className="panelMeta">{dues.length} pending items</span>}><form className="inlineForm duesForm" onSubmit={(e) => { e.preventDefault(); save('dues', form); setForm({ ...form, title: '', amount: '' }) }}><Field label="Title"><input required placeholder="Payment detail" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Type"><select value={form.due_type} onChange={(e) => setForm({ ...form, due_type: e.target.value })}><option value="payable">Payable</option><option value="receivable">Receivable</option></select></Field><Field label="Amount"><input required type="number" step="any" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field><Field label="Due date"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field><Field label="Party"><select value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}><option value="">No party</option>{parties.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></Field><button className="primary">Add due</button></form>{dues.length ? <div className="dueList">{dues.map((d) => <div key={d.id}><span>{d.title}<small>{d.party_name || 'No party'} - {d.due_date} - {formatLabel(d.status)}</small></span><strong>{currency(d.amount)}</strong><IconButton tone="danger" onClick={() => remove(d.id)}><Trash2 size={15} /></IconButton></div>)}</div> : <EmptyState title="No due payments" body="Payables and receivables will appear here." />}</Panel>
}

function SettingsPanel({ accounts, notes, save, remove, changePassword, themeStyle, setThemeStyle, customColors, setCustomColors }) {
  const [note, setNote] = useState({ title: '', body: '', reminder_date: '' })
  const [account, setAccount] = useState({ name: '', account_type: 'cash', opening_balance: 0, is_active: true })

  const updateColor = (key, value) => {
    setCustomColors(prev => ({ ...prev, [key]: value }))
  }

  const resetCustomization = () => {
    setThemeStyle('original')
    setCustomColors({ primary: '', bg: '', text: '', sidebarBg: '', sidebarText: '', panelBg: '' })
  }

  const themesList = [
    { id: 'original', name: 'Original Light', desc: 'Default layout styling.', color1: '#0f766e', color2: '#f3f6fa' },
    { id: 'glassmorphism', name: 'Glassmorphism', desc: 'Frosted glass & gradient.', color1: '#6366f1', color2: '#e0e7ff' },
    { id: 'dark', name: 'Dark & Sleek', desc: 'Midnight dark aesthetic.', color1: '#14b8a6', color2: '#0b0f19' },
    { id: 'brutalism', name: 'Neo-Brutalism', desc: 'High-contrast bold borders.', color1: '#facc15', color2: '#cbd5e1' },
    { id: 'cyberpunk', name: 'Cyberpunk Synthwave', desc: 'Futuristic glowing neon.', color1: '#ff007f', color2: '#05050a' },
    { id: 'pastel', name: 'Soft Pastel', desc: 'Cozy and sweet pastel theme.', color1: '#fda4af', color2: '#fafaf9' },
  ]

  return <Panel title="Admin login and settings" icon={Settings}>
    <div className="customization-card" style={{ padding: '20px', border: 'var(--panel-border)', borderRadius: 'var(--panel-radius)', background: 'var(--panel-bg)', marginBottom: '24px', transition: 'all var(--transition-speed)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)' }}>
        🎨 Personalization & Theme Styles
      </h3>

      {/* Theme selection grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {themesList.map(t => (
          <div
            key={t.id}
            onClick={() => {
              setThemeStyle(t.id);
              setCustomColors({ primary: '', bg: '', text: '', sidebarBg: '', sidebarText: '', panelBg: '' });
            }}
            style={{
              padding: '14px',
              borderRadius: 'var(--panel-radius)',
              border: themeStyle === t.id ? '2px solid var(--primary-color)' : 'var(--panel-border)',
              background: 'var(--bg-color)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all var(--transition-speed)',
              boxShadow: themeStyle === t.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-color)' }}>{t.name}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color1 }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color2, border: '1px solid #ccc' }} />
              </div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-color)', opacity: 0.8 }}>{t.desc}</span>
          </div>
        ))}
      </div>

      {/* Individual color pickers */}
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-color)' }}>🖌️ Custom Element Colors</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <Field label="Accent (Primary)">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="color" value={customColors.primary || '#0f766e'} onChange={(e) => updateColor('primary', e.target.value)} style={{ padding: '0', width: '38px', height: '38px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }} />
            <input type="text" value={customColors.primary || ''} placeholder="Default" onChange={(e) => updateColor('primary', e.target.value)} style={{ fontSize: '12px', height: '34px', minHeight: '34px' }} />
          </div>
        </Field>

        <Field label="Page Background">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="color" value={customColors.bg || '#f3f6fa'} onChange={(e) => updateColor('bg', e.target.value)} style={{ padding: '0', width: '38px', height: '38px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }} />
            <input type="text" value={customColors.bg || ''} placeholder="Default" onChange={(e) => updateColor('bg', e.target.value)} style={{ fontSize: '12px', height: '34px', minHeight: '34px' }} />
          </div>
        </Field>

        <Field label="Panel/Card BG">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="color" value={customColors.panelBg || '#ffffff'} onChange={(e) => updateColor('panelBg', e.target.value)} style={{ padding: '0', width: '38px', height: '38px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }} />
            <input type="text" value={customColors.panelBg || ''} placeholder="Default" onChange={(e) => updateColor('panelBg', e.target.value)} style={{ fontSize: '12px', height: '34px', minHeight: '34px' }} />
          </div>
        </Field>

        <Field label="Text Color">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="color" value={customColors.text || '#111827'} onChange={(e) => updateColor('text', e.target.value)} style={{ padding: '0', width: '38px', height: '38px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }} />
            <input type="text" value={customColors.text || ''} placeholder="Default" onChange={(e) => updateColor('text', e.target.value)} style={{ fontSize: '12px', height: '34px', minHeight: '34px' }} />
          </div>
        </Field>

        <Field label="Sidebar Background">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="color" value={customColors.sidebarBg || '#0f172a'} onChange={(e) => updateColor('sidebarBg', e.target.value)} style={{ padding: '0', width: '38px', height: '38px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }} />
            <input type="text" value={customColors.sidebarBg || ''} placeholder="Default" onChange={(e) => updateColor('sidebarBg', e.target.value)} style={{ fontSize: '12px', height: '34px', minHeight: '34px' }} />
          </div>
        </Field>

        <Field label="Sidebar Text">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="color" value={customColors.sidebarText || '#f8fafc'} onChange={(e) => updateColor('sidebarText', e.target.value)} style={{ padding: '0', width: '38px', height: '38px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }} />
            <input type="text" value={customColors.sidebarText || ''} placeholder="Default" onChange={(e) => updateColor('sidebarText', e.target.value)} style={{ fontSize: '12px', height: '34px', minHeight: '34px' }} />
          </div>
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={resetCustomization} style={{ fontSize: '13px', minHeight: '34px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: 'var(--panel-radius)', cursor: 'pointer', padding: '0 12px', transition: 'all var(--transition-speed)' }}>
          Reset to default theme
        </button>
      </div>
    </div>

    <div className="settingsStack">
      <form className="inlineForm" onSubmit={changePassword}><Field label="Old password"><input required type="password" name="old_password" placeholder="Current password" /></Field><Field label="New password"><input required type="password" name="new_password" placeholder="New secure password" /></Field><button className="primary">Change password</button></form>
      <form className="inlineForm" onSubmit={(e) => { e.preventDefault(); save('accounts', account); setAccount({ ...account, name: '', opening_balance: 0 }) }}><Field label="Account name"><input required placeholder="Cash counter, Bank account" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} /></Field><Field label="Type"><select value={account.account_type} onChange={(e) => setAccount({ ...account, account_type: e.target.value })}><option value="cash">Cash</option><option value="bank">Bank</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option></select></Field><Field label="Opening balance"><input type="number" step="any" placeholder="0" value={account.opening_balance} onChange={(e) => setAccount({ ...account, opening_balance: e.target.value })} /></Field><button className="primary">Add account</button></form>
      <form className="inlineForm" onSubmit={(e) => { e.preventDefault(); save('notes', note); setNote({ title: '', body: '', reminder_date: '' }) }}><Field label="Note title"><input required placeholder="Reminder title" value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} /></Field><Field label="Note"><input required placeholder="Reminder detail" value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} /></Field><Field label="Reminder date"><input type="date" value={note.reminder_date} onChange={(e) => setNote({ ...note, reminder_date: e.target.value })} /></Field><button className="primary">Add note</button></form>
    </div>
    <h3 className="sectionLabel">Accounts</h3><SimpleRows emptyTitle="No accounts yet" emptyBody="Add an account to begin tracking balances." rows={accounts.map((a) => [a.id, a.name, formatLabel(a.account_type), currency(a.current_balance)])} remove={(id) => remove('accounts', id)} />
    <h3 className="sectionLabel">Notes</h3><SimpleRows emptyTitle="No notes yet" emptyBody="Create reminders for follow-ups or payments." rows={notes.map((n) => [n.id, n.title, n.body, n.reminder_date])} remove={(id) => remove('notes', id)} />
  </Panel>
}

function SimpleRows({ rows, remove, customAction, emptyTitle = 'No records', emptyBody = 'Records will appear here.' }) {
  if (!rows.length) return <EmptyState title={emptyTitle} body={emptyBody} />
  return <div className="simpleList">{rows.map((row) => <div key={row[0]}>{row.slice(1).map((cell, index) => <span key={index}>{cell || '-'}</span>)}<div className="rowActions" style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>{customAction && <IconButton onClick={() => customAction.fn(row[0])} title="History"><customAction.icon size={15} /></IconButton>}{remove && <IconButton tone="danger" onClick={() => remove(row[0])}><Trash2 size={15} /></IconButton>}</div></div>)}</div>
}

function StockPanel({ stock, save, remove, exportStock, importStock }) {
  const [form, setForm] = useState({ name: '', quantity: '', unit_price: '', vendor_name: '', vendor_phone: '', vendor_address: '' })
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, quantity: editing.quantity, unit_price: editing.unit_price, id: editing.id, vendor_name: editing.vendor_name || '', vendor_phone: editing.vendor_phone || '', vendor_address: editing.vendor_address || '' })
    } else {
      setForm({ name: '', quantity: '', unit_price: '', vendor_name: '', vendor_phone: '', vendor_address: '' })
    }
  }, [editing])

  const handleSubmit = (e) => {
    e.preventDefault()
    save('stock', form)
    setEditing(null)
    setForm({ name: '', quantity: '', unit_price: '', vendor_name: '', vendor_phone: '', vendor_address: '' })
  }

  return (
    <div className="stockContainer">
      <Panel title={editing ? "Edit Stock Item" : "Add New Stock"} icon={Package}>
        <form className="inlineForm" onSubmit={handleSubmit}>
          <Field label="Stock Item Name">
            <input required placeholder="e.g. Cement Bag, Steel Rod" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Total Stock Quantity">
            <input required type="number" placeholder="Total quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
          <Field label="Unit Price (Rs)">
            <input required type="number" step="any" placeholder="Purchase price per unit" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          </Field>
          <Field label="Vendor Name">
            <input placeholder="Supplier name" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
          </Field>
          <Field label="Vendor Phone">
            <input placeholder="Supplier phone" value={form.vendor_phone} onChange={(e) => setForm({ ...form, vendor_phone: e.target.value })} />
          </Field>
          <Field label="Vendor Address">
            <input placeholder="Supplier address" value={form.vendor_address} onChange={(e) => setForm({ ...form, vendor_address: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', minHeight: '42px' }}>
            <button className="primary">{editing ? "Update" : "Add Stock"}</button>
            {editing && <button type="button" onClick={() => setEditing(null)}>Cancel</button>}
          </div>
        </form>
      </Panel>

      <div style={{ marginTop: '20px' }}>
        <Panel title="Stock Inventory Status" icon={Package} actions={<span className="panelMeta">{stock.length} items</span>}>
          <div className="exportGrid">
            <button type="button" className="btnExcelExport" onClick={() => exportStock('excel')}><FileSpreadsheet size={16} /> Excel export</button>
            <button type="button" className="btnPdfExport" onClick={() => exportStock('pdf')}><FileText size={16} /> PDF report</button>
            <label className="importLabel">
              <Upload size={16} /> Import Excel
              <input type="file" accept=".xlsx" onChange={(e) => { importStock(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
            </label>
          </div>
          {stock.length ? (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Vendor</th>
                    <th>Unit Price</th>
                    <th>Total Stock</th>
                    <th>Sold Stock</th>
                    <th>Remaining Stock</th>
                    <th>Value (Remaining)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.vendor_name ? <div style={{ lineHeight: '1.2' }}>{item.vendor_name}<br /><small style={{ color: 'var(--text-color)', opacity: 0.7 }}>{item.vendor_phone}</small></div> : '-'}</td>
                      <td>{currency(item.unit_price)}</td>
                      <td><span className="pill blue">{item.quantity}</span></td>
                      <td><span className="pill green">{item.sold_stock}</span></td>
                      <td>
                        <span className={`pill ${item.remaining_stock <= 5 ? 'red' : 'orange'}`}>
                          {item.remaining_stock}
                        </span>
                      </td>
                      <td>{currency(item.remaining_stock * item.unit_price)}</td>
                      <td>
                        <div className="rowActions">
                          <IconButton onClick={() => setEditing(item)}><Edit3 size={15} /></IconButton>
                          <IconButton tone="danger" onClick={() => remove(item.id)}><Trash2 size={15} /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No stock items found" body="Add stock items above to start tracking your inventory." />
          )}
        </Panel>
      </div>
    </div>
  )
}

function SalesPanel({ sales, stock, accounts, save, remove, exportSales, importSales }) {
  const [form, setForm] = useState({ stock: '', quantity: '', sale_price: '', date: new Date().toISOString().slice(0, 10), account: '', notes: '', customer_name: '', customer_phone: '', customer_address: '' })
  const [editing, setEditing] = useState(null)
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [templateSettings, setTemplateSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('invoice_template_settings')
      if (saved) return { ...defaultInvoiceTemplate, ...JSON.parse(saved) }
    } catch {}
    return defaultInvoiceTemplate
  })
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false)

  const updateTemplate = (updates) => {
    setTemplateSettings(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem('invoice_template_settings', JSON.stringify(next))
      } catch (e) {
        console.warn('Failed saving template', e)
      }
      return next
    })
  }

  const resetTemplate = () => {
    setTemplateSettings(defaultInvoiceTemplate)
    try {
      localStorage.removeItem('invoice_template_settings')
    } catch {}
  }

  useEffect(() => {
    if (editing) {
      setForm({
        stock: String(editing.stock),
        quantity: editing.quantity,
        sale_price: editing.sale_price,
        date: editing.date,
        account: String(editing.account),
        notes: editing.notes || '',
        customer_name: editing.customer_name || '',
        customer_phone: editing.customer_phone || '',
        customer_address: editing.customer_address || '',
        id: editing.id
      })
    } else {
      setForm({
        stock: '',
        quantity: '',
        sale_price: '',
        date: new Date().toISOString().slice(0, 10),
        account: accounts.length ? String(accounts[0].id) : '',
        notes: '',
        customer_name: '',
        customer_phone: '',
        customer_address: ''
      })
    }
  }, [editing, accounts])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await save('sales', form)
    setEditing(null)
    setForm({
      stock: '',
      quantity: '',
      sale_price: '',
      date: new Date().toISOString().slice(0, 10),
      account: accounts.length ? String(accounts[0].id) : '',
      notes: '',
      customer_name: '',
      customer_phone: '',
      customer_address: ''
    })
  }

  const handleStockChange = (e) => {
    const selectedStockId = e.target.value
    const selectedStock = stock.find(s => String(s.id) === selectedStockId)
    setForm(f => ({
      ...f,
      stock: selectedStockId,
      sale_price: selectedStock ? selectedStock.unit_price : ''
    }))
  }

  return (
    <div className="salesContainer">
      <Panel title={editing ? "Edit Sale Record" : "Record New Sale"} icon={ShoppingCart}>
        <form className="salesForm" onSubmit={handleSubmit}>
          <Field label="Select Stock Item">
            <select required value={form.stock} onChange={handleStockChange}>
              <option value="" disabled>Select Item</option>
              {stock.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Remaining: {item.remaining_stock})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sale Quantity">
            <input required type="number" placeholder="Qty sold" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
          <Field label="Sale Price (per unit)">
            <input required type="number" step="any" placeholder="Sale price per unit" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
          </Field>
          <Field label="Account (Received In)">
            <select required value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
              <option value="" disabled>Select Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatLabel(acc.account_type)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Customer Name">
            <input placeholder="Walk-in Customer" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </Field>
          <Field label="Customer Phone">
            <input placeholder="Customer phone number" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          </Field>
          <Field label="Customer Address">
            <input placeholder="Customer address" value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} />
          </Field>
          <Field label="Notes">
            <input placeholder="Optional sale comments" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', minHeight: '42px' }}>
            <button className="primary">{editing ? "Update" : "Record Sale"}</button>
            {editing && <button type="button" onClick={() => setEditing(null)}>Cancel</button>}
          </div>
        </form>
      </Panel>

      <div style={{ marginTop: '20px' }}>
        <Panel title="Sales Ledger" icon={ShoppingCart} actions={<span className="panelMeta">{sales.length} sales</span>}>
          <div className="exportGrid">
            <button type="button" className="btnExcelExport" onClick={() => exportSales('excel')}><FileSpreadsheet size={16} /> Excel export</button>
            <button type="button" className="btnPdfExport" onClick={() => exportSales('pdf')}><FileText size={16} /> PDF report</button>
            <label className="importLabel">
              <Upload size={16} /> Import Excel
              <input type="file" accept=".xlsx" onChange={(e) => { importSales(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
            </label>
          </div>
          {sales.length ? (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Stock Item</th>
                    <th>Customer</th>
                    <th>Quantity</th>
                    <th>Sale Price</th>
                    <th>Total Price</th>
                    <th>Account</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{new Date(sale.date).toLocaleDateString()}</td>
                      <td><strong>{sale.stock_name}</strong></td>
                      <td>
                        {sale.customer_name ? (
                          <div>
                            <strong>{sale.customer_name}</strong>
                            {sale.customer_phone && <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>{sale.customer_phone}</small>}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Walk-in</span>
                        )}
                      </td>
                      <td>{sale.quantity}</td>
                      <td>{currency(sale.sale_price)}</td>
                      <td><strong className="positive">{currency(sale.total_price)}</strong></td>
                      <td><span className="pill">{sale.account_name}</span></td>
                      <td><small>{sale.notes || '-'}</small></td>
                      <td>
                        <div className="rowActions">
                          <IconButton onClick={() => setActiveInvoice(sale)} title="Invoice"><Printer size={15} /></IconButton>
                          <IconButton onClick={() => setEditing(sale)} title="Edit"><Edit3 size={15} /></IconButton>
                          <IconButton tone="danger" onClick={() => remove(sale.id)} title="Delete"><Trash2 size={15} /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No sales recorded" body="Add product sales above to track transactions." />
          )}
        </Panel>
      </div>

      {activeInvoice && (
        <div className="modalOverlay invoiceModalOverlay" onClick={() => setActiveInvoice(null)}>
          <div className={`invoiceModalContainer ${showTemplateDrawer ? 'is-split-active' : ''}`} onClick={(e) => e.stopPropagation()}>
            {/* Top Toolbar (no-print) */}
            <div className="invoiceControlsBar no-print">
              <div className="invoiceControlsLeft">
                <span className="invoiceControlsTitle">
                  <Printer size={15} color="#2563eb" /> Invoice Preview
                </span>
                <div className="invoicePresetTabs">
                  <button
                    type="button"
                    className={`invoicePresetTab ${templateSettings.mode === 'standard' ? 'active' : ''}`}
                    onClick={() => updateTemplate({ mode: 'standard', hideBranding: false })}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    className={`invoicePresetTab ${templateSettings.mode === 'letterhead' ? 'active' : ''}`}
                    onClick={() => updateTemplate({ mode: 'letterhead' })}
                  >
                    <FileImage size={13} /> Letterhead {templateSettings.letterheadImage ? '✓' : ''}
                  </button>
                  <button
                    type="button"
                    className={`invoicePresetTab ${templateSettings.mode === 'stationery' ? 'active' : ''}`}
                    onClick={() => updateTemplate({ mode: 'stationery', hideBranding: true })}
                  >
                    Pre-printed Paper
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Size:</span>
                  <select
                    className="invoiceTopPaperSelect"
                    value={templateSettings.pageSize || 'A4'}
                    onChange={(e) => {
                      const val = e.target.value
                      let updates = { pageSize: val }
                      if (val === 'A4') updates = { ...updates, customWidth: '210mm', customHeight: '297mm' }
                      else if (val === 'A5') updates = { ...updates, customWidth: '148mm', customHeight: '210mm' }
                      else if (val === 'Letter') updates = { ...updates, customWidth: '216mm', customHeight: '279mm' }
                      else if (val === 'Legal') updates = { ...updates, customWidth: '216mm', customHeight: '356mm' }
                      else if (val === 'Thermal80') updates = { ...updates, customWidth: '80mm', customHeight: 'auto', pageMargin: '2mm' }
                      else if (val === 'Thermal58') updates = { ...updates, customWidth: '58mm', customHeight: 'auto', pageMargin: '2mm' }
                      updateTemplate(updates)
                    }}
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                    <option value="Thermal80">POS 80mm</option>
                    <option value="Thermal58">POS 58mm</option>
                    <option value="custom">Custom Size</option>
                  </select>
                </div>
              </div>

              <div className="invoiceControlsRight">
                <button
                  type="button"
                  className={`btnTemplateCustomizer ${showTemplateDrawer ? 'active' : ''}`}
                  onClick={() => setShowTemplateDrawer(!showTemplateDrawer)}
                >
                  <Sliders size={14} /> {showTemplateDrawer ? 'Close Settings' : 'Customize Template'}
                </button>
                <button type="button" className="btnPrintInvoice" onClick={() => window.print()}>
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button type="button" className="btnCloseModal" onClick={() => setActiveInvoice(null)} title="Close">
                  ✕
                </button>
              </div>
            </div>

            {/* Split View Studio Workspace (Side-by-Side: Settings Left, Live Invoice Right) */}
            <div className={`invoiceModalWorkspace ${showTemplateDrawer ? 'has-split-view' : ''}`}>
              {/* Left Sidebar: Customize Template Drawer (no-print) */}
              {showTemplateDrawer && (
                <aside className="invoiceCustomizerSidebar no-print">
                  {/* Card 1: Branding & Logo */}
                  <div className="customizerCard">
                    <span className="customizerCardTitle">
                      <ImageIcon size={13} color="#2563eb" /> Business Brand & Logo
                    </span>
                    <div className="customizerField">
                      <label>Business / Shop Name</label>
                      <input
                        type="text"
                        value={templateSettings.companyName || ''}
                        placeholder="e.g. Codex Plus"
                        onChange={(e) => updateTemplate({ companyName: e.target.value })}
                      />
                    </div>
                    <div className="customizerField">
                      <label>Tagline / Subtitle</label>
                      <input
                        type="text"
                        value={templateSettings.tagline || ''}
                        placeholder="e.g. Accounts & Billing"
                        onChange={(e) => updateTemplate({ tagline: e.target.value })}
                      />
                    </div>
                    <div className="customizerField">
                      <label>Address / Contact (Optional)</label>
                      <input
                        type="text"
                        value={templateSettings.address || ''}
                        placeholder="e.g. Main Market, City | 0325-3315524"
                        onChange={(e) => updateTemplate({ address: e.target.value })}
                      />
                    </div>
                    <div className="customizerField">
                      <label>Custom Logo (Auto-Fit & Trim)</label>
                      <div className="uploadRow">
                        <label className="btnUploadSmall">
                          <Upload size={12} /> {templateSettings.logo ? 'Change Logo' : 'Upload Logo'}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                try {
                                  const data = await processImageUpload(file, 1200, 800, true)
                                  updateTemplate({ logo: data })
                                } catch (err) {
                                  alert('Could not load image: ' + err.message)
                                }
                              }
                            }}
                          />
                        </label>
                        {templateSettings.logo && (
                          <>
                            <img src={templateSettings.logo} alt="Logo" className="previewThumbWide" />
                            <button
                              type="button"
                              className="btnAutoFix"
                              title="Auto-crop extra borders & fit logo cleanly"
                              onClick={async () => {
                                const fixed = await autoTrimDataUrl(templateSettings.logo)
                                updateTemplate({ logo: fixed })
                              }}
                            >
                              <Wand2 size={11} /> Auto-Fix
                            </button>
                            <button
                              type="button"
                              className="btnRemoveSmall"
                              onClick={() => updateTemplate({ logo: '' })}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="customizerField">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>Logo Size: {templateSettings.logoHeight || 52}px</label>
                      </div>
                      <div className="sliderRow">
                        <input
                          type="range"
                          min="28"
                          max="80"
                          step="2"
                          value={templateSettings.logoHeight || 52}
                          onChange={(e) => updateTemplate({ logoHeight: parseInt(e.target.value, 10) })}
                        />
                        <span className="sliderVal">{templateSettings.logoHeight || 52}px</span>
                      </div>
                    </div>

                    <div className="customizerField" style={{ marginTop: '2px' }}>
                      <label className="customizerCheckRow">
                        <input
                          type="checkbox"
                          checked={templateSettings.showBrandText !== false}
                          onChange={(e) => updateTemplate({ showBrandText: e.target.checked })}
                        />
                        <span>Show Company Name next to Logo</span>
                      </label>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginLeft: '22px', marginTop: '1px' }}>
                        (Uncheck if your logo image already contains your business name)
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Letterhead / Template Image */}
                  <div className="customizerCard">
                    <span className="customizerCardTitle">
                      <FileImage size={13} color="#2563eb" /> Letterhead & Background Template
                    </span>
                    <div className="customizerField">
                      <label>Upload Letterhead Image (PNG / JPG / WebP)</label>
                      <div className="uploadRow">
                        <label className="btnUploadSmall">
                          <Upload size={12} /> {templateSettings.letterheadImage ? 'Change Letterhead' : 'Upload Letterhead'}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                try {
                                  const data = await processImageUpload(file, 1600, 2400)
                                  updateTemplate({ letterheadImage: data, mode: 'letterhead' })
                                } catch (err) {
                                  alert('Could not load image: ' + err.message)
                                }
                              }
                            }}
                          />
                        </label>
                        {templateSettings.letterheadImage && (
                          <>
                            <img src={templateSettings.letterheadImage} alt="Letterhead" className="previewThumb" />
                            <button
                              type="button"
                              className="btnRemoveSmall"
                              onClick={() => updateTemplate({ letterheadImage: '', mode: 'standard' })}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="customizerField" style={{ marginTop: '4px' }}>
                      <label>Top Spacing / Header Offset: {templateSettings.topPadding || 24}px</label>
                      <div className="sliderRow">
                        <input
                          type="range"
                          min="0"
                          max="280"
                          step="4"
                          value={templateSettings.topPadding || 24}
                          onChange={(e) => updateTemplate({ topPadding: Number(e.target.value) })}
                        />
                        <span className="sliderVal">{templateSettings.topPadding || 24}px</span>
                      </div>
                      <small style={{ color: '#94a3b8', fontSize: '10px' }}>
                        Adjust so invoice table starts neatly below your letterhead header
                      </small>
                    </div>

                    <label className="customizerCheckRow" style={{ marginTop: '4px' }}>
                      <input
                        type="checkbox"
                        checked={!!templateSettings.hideBranding}
                        onChange={(e) => updateTemplate({ hideBranding: e.target.checked })}
                      />
                      <span>Hide digital brand logo/name (use letterhead's artwork)</span>
                    </label>
                  </div>

                  {/* Card 3: Paper Size & Custom Dimensions */}
                  <div className="customizerCard">
                    <span className="customizerCardTitle">
                      <FileSpreadsheet size={13} color="#2563eb" /> Paper Size & Format
                    </span>
                    <div className="customizerField">
                      <label>Paper Size Preset</label>
                      <select
                        className="customizerSelect"
                        value={templateSettings.pageSize || 'A4'}
                        onChange={(e) => {
                          const val = e.target.value
                          let updates = { pageSize: val }
                          if (val === 'A4') updates = { ...updates, customWidth: '210mm', customHeight: '297mm' }
                          else if (val === 'A5') updates = { ...updates, customWidth: '148mm', customHeight: '210mm' }
                          else if (val === 'Letter') updates = { ...updates, customWidth: '216mm', customHeight: '279mm' }
                          else if (val === 'Legal') updates = { ...updates, customWidth: '216mm', customHeight: '356mm' }
                          else if (val === 'Thermal80') updates = { ...updates, customWidth: '80mm', customHeight: 'auto', pageMargin: '2mm' }
                          else if (val === 'Thermal58') updates = { ...updates, customWidth: '58mm', customHeight: 'auto', pageMargin: '2mm' }
                          updateTemplate(updates)
                        }}
                      >
                        <option value="A4">A4 (210 × 297 mm) - Standard</option>
                        <option value="A5">A5 (148 × 210 mm) - Half Page</option>
                        <option value="Letter">Letter (8.5 × 11 in)</option>
                        <option value="Legal">Legal (8.5 × 14 in)</option>
                        <option value="Thermal80">POS Receipt Roll (80 mm)</option>
                        <option value="Thermal58">POS Receipt Roll (58 mm)</option>
                        <option value="custom">Custom Size (Apni Marzi Ka Size)</option>
                      </select>
                    </div>

                    <div className="customizerField" style={{ marginTop: '2px' }}>
                      <label>Custom Dimensions</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div>
                          <input
                            type="text"
                            value={templateSettings.customWidth || '210mm'}
                            placeholder="Width (e.g. 210mm)"
                            onChange={(e) => updateTemplate({ customWidth: e.target.value, pageSize: 'custom' })}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={templateSettings.customHeight || '297mm'}
                            placeholder="Height (e.g. 297mm)"
                            onChange={(e) => updateTemplate({ customHeight: e.target.value, pageSize: 'custom' })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="customizerField" style={{ marginTop: '4px' }}>
                      <label>Orientation</label>
                      <div className="customizerSegmentedControl">
                        <button
                          type="button"
                          className={`segmentBtn ${templateSettings.pageOrientation !== 'landscape' ? 'active' : ''}`}
                          onClick={() => updateTemplate({ pageOrientation: 'portrait' })}
                        >
                          Portrait ↕
                        </button>
                        <button
                          type="button"
                          className={`segmentBtn ${templateSettings.pageOrientation === 'landscape' ? 'active' : ''}`}
                          onClick={() => updateTemplate({ pageOrientation: 'landscape' })}
                        >
                          Landscape ↔
                        </button>
                      </div>
                    </div>

                    <div className="customizerField" style={{ marginTop: '4px' }}>
                      <label>Print Margin</label>
                      <select
                        className="customizerSelect"
                        value={templateSettings.pageMargin || '8mm'}
                        onChange={(e) => updateTemplate({ pageMargin: e.target.value })}
                      >
                        <option value="8mm">Standard Margin (8 mm)</option>
                        <option value="5mm">Compact Margin (5 mm)</option>
                        <option value="2mm">Narrow Margin (2 mm)</option>
                        <option value="0mm">Zero Margin (Full Bleed)</option>
                      </select>
                    </div>
                  </div>

                  {/* Card 4: Footer Note & Preset Mode */}
                  <div className="customizerCard">
                    <span className="customizerCardTitle">
                      <Edit3 size={13} color="#2563eb" /> Footer Note & Presets
                    </span>
                    <div className="customizerField">
                      <label>Invoice Footer Note</label>
                      <input
                        type="text"
                        value={templateSettings.footerNote || ''}
                        placeholder="e.g. Thank you for your business!"
                        onChange={(e) => updateTemplate({ footerNote: e.target.value })}
                      />
                    </div>

                    <div className="customizerField" style={{ marginTop: '6px' }}>
                      <label>Template Preset Mode</label>
                      <div className="customizerPresetPills">
                        <button
                          type="button"
                          className={`presetPill ${templateSettings.mode === 'standard' ? 'active' : ''}`}
                          onClick={() => updateTemplate({ mode: 'standard', hideBranding: false })}
                        >
                          <span className="presetPillDot" />
                          <div className="presetPillText">
                            <strong>Standard Modern Design</strong>
                            <span>Clean digital header & branding</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`presetPill ${templateSettings.mode === 'letterhead' ? 'active' : ''}`}
                          onClick={() => updateTemplate({ mode: 'letterhead' })}
                        >
                          <span className="presetPillDot" />
                          <div className="presetPillText">
                            <strong>Letterhead Background Image</strong>
                            <span>Print onto graphic letterhead image</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`presetPill ${templateSettings.mode === 'stationery' ? 'active' : ''}`}
                          onClick={() => updateTemplate({ mode: 'stationery', hideBranding: true })}
                        >
                          <span className="presetPillDot" />
                          <div className="presetPillText">
                            <strong>Pre-printed Stationery Paper</strong>
                            <span>Blank header offset for company paper</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="customizerFooterRow">
                    <span style={{ color: '#64748b', fontSize: '11px' }}>
                      ✓ Auto-saved for future invoices
                    </span>
                    <button type="button" className="btnResetTemplate" onClick={resetTemplate}>
                      <RotateCcw size={12} /> Reset Defaults
                    </button>
                  </div>
                </aside>
              )}

              {/* Right Stage: The Live Real-Time Invoice Canvas */}
              <main className="invoicePreviewStage">
                {/* Dynamic Print CSS for chosen Paper Size & Margins */}
                <style>
                  {`
                    @media print {
                      @page {
                        size: ${computePageSize(templateSettings)};
                        margin: ${computePageMargin(templateSettings)};
                      }
                    }
                  `}
                </style>

                {/* The Actual Invoice Paper (What prints) */}
                <div
                  className={`printable-invoice ${templateSettings.mode === 'letterhead' && templateSettings.letterheadImage ? 'has-letterhead-bg' : ''} ${templateSettings.pageSize?.startsWith('Thermal') ? 'is-receipt' : ''}`}
              style={{
                maxWidth: getPreviewMaxWidth(templateSettings),
                paddingTop: `${templateSettings.topPadding || 24}px`,
                ...(templateSettings.mode === 'letterhead' && templateSettings.letterheadImage ? {
                  backgroundImage: `url(${templateSettings.letterheadImage})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'top center'
                } : {})
              }}
            >
              <div className="invoice-header">
                {!templateSettings.hideBranding ? (
                  <div className="invoice-brand">
                    <div
                      className="invoice-brand-logo-wrap"
                      style={{
                        minHeight: `${Math.min(templateSettings.logoHeight || 52, 44)}px`,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <img
                        src={templateSettings.logo || CODEX_LOGO_MARK}
                        alt={templateSettings.companyName || 'Codex Plus'}
                        className="invoice-brand-logo-img"
                        style={{
                          maxHeight: `${templateSettings.logoHeight || 52}px`,
                          maxWidth: templateSettings.showBrandText !== false ? '220px' : '360px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    {templateSettings.showBrandText !== false && (
                      <div className="invoice-brand-text">
                        <h2>{templateSettings.companyName || 'Codex Plus'}</h2>
                        <span>{templateSettings.tagline || 'Accounts & Billing'}</span>
                        {templateSettings.address && (
                          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {templateSettings.address}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="invoice-brand" style={{ visibility: 'hidden' }}>
                    <div style={{ height: `${templateSettings.logoHeight || 52}px` }} />
                  </div>
                )}
                <div className="invoice-meta">
                  <h3>INVOICE</h3>
                  <p><strong>Invoice #:</strong> INV-SALE-{activeInvoice.id}</p>
                  <p><strong>Date:</strong> {(() => {
                    try {
                      const d = new Date(activeInvoice.date);
                      return !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : activeInvoice.date;
                    } catch {
                      return activeInvoice.date;
                    }
                  })()}</p>
                </div>
              </div>

              <div className="invoice-body">
                <div className="invoice-bill-to">
                  <h4>Billed To:</h4>
                  <div className="invoice-bill-card">
                    <p className="customer-name"><strong>{activeInvoice.customer_name || 'Walk-in Customer'}</strong></p>
                    {activeInvoice.customer_phone && <p><span>Phone:</span> {activeInvoice.customer_phone}</p>}
                    {activeInvoice.customer_address && <p><span>Address:</span> {activeInvoice.customer_address}</p>}
                    {activeInvoice.notes && <p className="invoice-notes"><span>Notes:</span> {activeInvoice.notes}</p>}
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50%' }}>Item Description</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Rate</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{activeInvoice.stock_name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{activeInvoice.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{currency(activeInvoice.sale_price)}</td>
                      <td style={{ textAlign: 'right' }}><strong>{currency(activeInvoice.total_price)}</strong></td>
                    </tr>
                  </tbody>
                </table>

                <div className="invoice-summary-wrap">
                  <div className="invoice-payment-method">
                    <p style={{ margin: 0 }}><span>Payment Account:</span> <strong>{activeInvoice.account_name || 'Cash'}</strong></p>
                  </div>
                  <div className="invoice-total-section">
                    <div className="invoice-total-row">
                      <span>Subtotal:</span>
                      <span>{currency(activeInvoice.total_price)}</span>
                    </div>
                    <div className="invoice-total-row grand-total">
                      <span>Grand Total:</span>
                      <strong>{currency(activeInvoice.total_price)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="invoice-footer">
                <p>{templateSettings.footerNote || 'Thank you for your business!'}</p>
              </div>

              {/* Permanent CODEX PLUS Branding & PR Watermark Footer (Cannot be removed) */}
              <div className="invoice-pr-watermark">
                <div className="invoice-pr-content">
                  <div className="invoice-pr-brand-line">
                    <span>App Developed and Updated by:</span>
                    <a
                      href="https://codexplus.site/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      codexplus
                    </a>
                    <span>(https://codexplus.site/)</span>
                  </div>
                  <div className="invoice-pr-contacts">
                    <span><strong>Call us:</strong> +923253315524</span>
                    <span className="invoice-pr-sep">•</span>
                    <span><strong>Email us:</strong> info@codexplus.site</span>
                  </div>
                </div>
              </div>

              <div className="invoice-actions no-print">
                <button
                  type="button"
                  className="btnTemplateCustomizer"
                  onClick={() => setShowTemplateDrawer(!showTemplateDrawer)}
                >
                  <Sliders size={14} /> {showTemplateDrawer ? 'Close Customizer' : 'Customize Template / Letterhead'}
                </button>
                <button type="button" className="primary" onClick={() => window.print()}>
                  <Printer size={16} /> Print / Save PDF
                </button>
                <button type="button" className="close-btn" onClick={() => setActiveInvoice(null)}>
                  Close
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )}

      {/* Permanent Global Print Watermark for any page/ledger printed from browser */}
      <div className="print-global-pr-footer">
        <div className="print-global-pr-line">
          App Developed and Updated by: <strong>codexplus</strong> (https://codexplus.site/)
        </div>
        <div className="print-global-pr-contacts">
          Call us: +923253315524 &bull; Email us: info@codexplus.site
        </div>
      </div>
    </div>
  )
}
