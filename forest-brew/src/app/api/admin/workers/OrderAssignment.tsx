'use client'

import { useState, useEffect } from 'react'

interface Worker {
  id: string
  name: string
  _count: {
    assignedOrders: number
  }
}

export function OrderAssignment({ order }: { order: any }) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorker, setSelectedWorker] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch free workers when component mounts
  useEffect(() => {
    async function fetchWorkers() {
      try {
        const res = await fetch('/api/admin/workers')
        if (res.ok) {
          const data = await res.json()
          // Filter for workers with 0 active orders (free)
          const freeWorkers = data.filter((w: Worker) => w._count.assignedOrders === 0)
          setWorkers(freeWorkers.length > 0 ? freeWorkers : data)
        }
      } catch (err) {
        console.error('Failed to fetch workers:', err)
      }
    }
    fetchWorkers()
  }, [])

  const handleAssign = async () => {
    if (!selectedWorker) return
    setLoading(true)
    
    try {
      await fetch('/api/admin/orders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, workerId: selectedWorker }),
      })
      // You can add a callback prop here to refresh the admin's order list
    } catch (err) {
      console.error('Failed to assign order:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
      <select 
        value={selectedWorker} 
        onChange={(e) => setSelectedWorker(e.target.value)}
        style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(168,197,160,0.3)', outline: 'none' }}
      >
        <option value="" style={{ color: 'black' }}>Select a free worker...</option>
        {workers.map(w => (
          <option key={w.id} value={w.id} style={{ color: 'black' }}>
            {w.name} ({w._count.assignedOrders} active)
          </option>
        ))}
      </select>
      
      <button onClick={handleAssign} disabled={loading || !selectedWorker} className="btn-primary" style={{ padding: '6px 16px', minWidth: 'auto' }}>
        {loading ? 'Assigning...' : 'Assign'}
      </button>
    </div>
  )
}