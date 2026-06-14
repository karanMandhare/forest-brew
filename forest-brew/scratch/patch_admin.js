const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Part 1: Replace options mapping for order registry assign worker
const searchRegistryOption = `                                             {workersList.map((worker) => (
                                               <option key={worker.id} value={worker.id}>
                                                 {worker.name} ({worker.phone || 'No Phone'})
                                               </option>
                                             ))}`;

const replaceRegistryOption = `                                             {workersList.map((worker) => (
                                               <option key={worker.id} value={worker.id}>
                                                 {worker.name} ({worker.phone || 'No Phone'}){worker.id === recommendedWorkerId ? ' ★ Recommended' : ''}
                                               </option>
                                             ))}`;

if (content.includes(searchRegistryOption)) {
  content = content.replace(searchRegistryOption, replaceRegistryOption);
  console.log('Successfully patched order registry assign dropdown options!');
} else {
  console.error('Could not find order registry option target!');
}

// Part 2: Insert inventory and complaints tab blocks before the closing wrapper div
// Find the end of workers tab and insert
const searchWorkersEnd = `              </div>
            )}

        </div>`;

const inventoryTabJsx = `            {activeTab === 'inventory' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                      📦 Inventory Management & Stock Alert
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                      Track ingredients, coffee beans, syrups, and packaging. Receive real-time alerts when stock drops below thresholds.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingInventoryItem(null)
                      setInvName('')
                      setInvQuantity(0)
                      setInvUnit('units')
                      setInvThreshold(10)
                      setInvCategory('')
                      setInvError('')
                      setIsInventoryModalOpen(true)
                    }}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 'var(--radius-full)' }}
                  >
                    ➕ Add Stock Item
                  </button>
                </div>

                {/* Low Stock Alerts Banner */}
                {inventoryList.filter(item => item.quantity <= item.threshold).length > 0 && (
                  <div style={{
                    background: 'rgba(229, 57, 53, 0.12)',
                    border: '1px solid rgba(229, 57, 53, 0.35)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    marginBottom: 24,
                    color: '#ef5350',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                      🚨 {inventoryList.filter(item => item.quantity <= item.threshold).length} Low Stock Alert(s)
                    </strong>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {inventoryList.filter(item => item.quantity <= item.threshold).map(item => (
                        <span key={item.id} style={{ background: 'rgba(229, 57, 53, 0.2)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          ⚠️ {item.name}: {item.quantity} {item.unit} (Min: {item.threshold})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inventory Table/Grid */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Item Name</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Category</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Stock Level</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Threshold</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700 }}>Status</th>
                          <th style={{ padding: '16px 20px', fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInventory ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                              ⏳ Loading inventory items...
                            </td>
                          </tr>
                        ) : inventoryList.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                              📦 No inventory records found.
                            </td>
                          </tr>
                        ) : (
                          inventoryList.map(item => {
                            const isLow = item.quantity <= item.threshold;
                            return (
                              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '16px 20px', color: 'var(--cream)', fontWeight: 600 }}>{item.name}</td>
                                <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.7)' }}>{item.category || 'Uncategorized'}</td>
                                <td style={{ padding: '16px 20px', color: isLow ? '#ef5350' : 'var(--mint)', fontWeight: 700 }}>
                                  {item.quantity} {item.unit}
                                </td>
                                <td style={{ padding: '16px 20px', color: 'var(--sage)' }}>{item.threshold} {item.unit}</td>
                                <td style={{ padding: '16px 20px' }}>
                                  {isLow ? (
                                    <span style={{ background: 'rgba(229, 57, 53, 0.15)', color: '#ef5350', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700 }}>
                                      ⚠️ LOW STOCK
                                    </span>
                                  ) : (
                                    <span style={{ background: 'rgba(74, 140, 63, 0.15)', color: 'var(--mint)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700 }}>
                                      ✅ OK
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button
                                      onClick={() => {
                                        setEditingInventoryItem(item)
                                        setInvName(item.name)
                                        setInvQuantity(item.quantity)
                                        setInvUnit(item.unit)
                                        setInvThreshold(item.threshold)
                                        setInvCategory(item.category || '')
                                        setInvError('')
                                        setIsInventoryModalOpen(true)
                                      }}
                                      className="btn-outline"
                                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteInventory(item.id)}
                                      className="btn-outline"
                                      style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#ef5350', borderColor: 'rgba(229, 57, 53, 0.2)' }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'complaints' && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--mint)' }}>
                    ⚠️ Customer Complaints & Refund Console
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: 4 }}>
                    Review customer complaints, view linked order receipts, and process wallet refunds or mark complaints as resolved.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {loadingFeedback ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sage)' }}>
                      ⏳ Loading complaints registry...
                    </div>
                  ) : feedbackList.filter(fb => fb.type === 'COMPLAINT').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', color: 'var(--sage)' }}>
                      🪵 No active customer complaints filed. Great job!
                    </div>
                  ) : (
                    feedbackList.filter(fb => fb.type === 'COMPLAINT').map((complaint) => (
                      <div key={complaint.id} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{
                                background: complaint.status === 'PENDING' ? 'rgba(229,57,53,0.15)' : complaint.status === 'REFUNDED' ? 'rgba(200,135,58,0.15)' : 'rgba(74,140,63,0.15)',
                                color: complaint.status === 'PENDING' ? '#ef5350' : complaint.status === 'REFUNDED' ? 'var(--amber)' : 'var(--mint)',
                                border: \`1px solid \${complaint.status === 'PENDING' ? 'rgba(229,57,53,0.3)' : complaint.status === 'REFUNDED' ? 'rgba(200,135,58,0.3)' : 'rgba(74,140,63,0.3)'}\`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}>
                                {complaint.status}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>
                                Filed on {new Date(complaint.createdAt).toLocaleDateString()} at {new Date(complaint.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cream)', marginTop: 8 }}>
                              Complaint #{complaint.id.slice(-6).toUpperCase()} by {complaint.user?.name || 'Guest User'}
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--sage)', marginTop: 2 }}>
                              Email: <strong>{complaint.user?.email || 'N/A'}</strong>
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <span key={idx} style={{ color: idx < complaint.rating ? 'var(--gold)' : 'rgba(255,255,255,0.1)', fontSize: '1.1rem' }}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        {complaint.comments && (
                          <div style={{
                            background: 'rgba(0,0,0,0.15)',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '3px solid #ef5350',
                            fontSize: '0.88rem',
                            color: 'var(--cream)',
                            lineHeight: 1.5
                          }}>
                            "{complaint.comments}"
                          </div>
                        )}

                        {complaint.order && (
                          <div style={{
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px dashed rgba(255,255,255,0.08)',
                            borderRadius: 'var(--radius-md)',
                            padding: 16,
                            fontSize: '0.82rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12
                          }}>
                            <div>
                              <strong style={{ color: 'var(--sage)' }}>Linked Order ID:</strong>{' '}
                              <span style={{ fontFamily: 'monospace', color: 'var(--cream)' }}>{complaint.order.id}</span>
                            </div>
                            <div>
                              <strong style={{ color: 'var(--sage)' }}>Order Amount:</strong>{' '}
                              <span style={{ color: 'var(--mint)', fontWeight: 700 }}>₹{(complaint.order.totalAmount / 100).toFixed(2)}</span>
                            </div>
                            <div>
                              <strong style={{ color: 'var(--sage)' }}>Order Date:</strong>{' '}
                              <span>{new Date(complaint.order.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}

                        {complaint.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                            <button
                              onClick={() => handleResolveComplaint(complaint.id, 'RESOLVE')}
                              className="btn-outline"
                              style={{ padding: '8px 20px', fontSize: '0.8rem' }}
                            >
                              ✅ Resolve without Refund
                            </button>
                            {complaint.order && complaint.userId && (
                              <button
                                onClick={() => handleResolveComplaint(complaint.id, 'REFUND', complaint.order.totalAmount)}
                                className="btn-primary"
                                style={{ padding: '8px 24px', fontSize: '0.8rem', background: '#e53935', borderColor: '#d32f2f' }}
                              >
                                💸 Issue Wallet Refund
                              </button>
                            )}
                          </div>
                        )}

                        {complaint.status === 'REFUNDED' && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--sage)', textAlign: 'right', fontStyle: 'italic' }}>
                            Refunded amount of ₹{((complaint.refundAmount || 0) / 100).toFixed(2)} issued to customer wallet.
                          </div>
                        )}
                        {complaint.status === 'RESOLVED' && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--sage)', textAlign: 'right', fontStyle: 'italic' }}>
                            Marked resolved on {complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleDateString() : 'N/A'}.
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Inventory Add/Edit Modal */}
            <AnimatePresence>
              {isInventoryModalOpen && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(5px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 999,
                  padding: 16
                }}>
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    style={{
                      background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)',
                      border: '1px solid var(--mint)',
                      borderRadius: 'var(--radius-xl)',
                      padding: 32,
                      width: '100%',
                      maxWidth: 500,
                      boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                      color: 'var(--cream)'
                    }}
                  >
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--cream)', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                      {editingInventoryItem ? '✏️ Edit Stock Item' : '➕ Add New Inventory Item'}
                    </h4>

                    <form onSubmit={handleSaveInventory} style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Item Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Arabica Espresso Beans"
                          value={invName}
                          onChange={(e) => setInvName(e.target.value)}
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 16px',
                            color: '#fff',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Quantity *</label>
                          <input
                            type="number"
                            required
                            value={invQuantity}
                            onChange={(e) => setInvQuantity(parseInt(e.target.value) || 0)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Unit *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. kg, liters, cups"
                            value={invUnit}
                            onChange={(e) => setInvUnit(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Alert Threshold *</label>
                          <input
                            type="number"
                            required
                            value={invThreshold}
                            onChange={(e) => setInvThreshold(parseInt(e.target.value) || 0)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>Category</label>
                          <input
                            type="text"
                            placeholder="e.g. Beans, Dairy, Cups"
                            value={invCategory}
                            onChange={(e) => setInvCategory(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 16px',
                              color: '#fff',
                              fontSize: '0.9rem',
                              width: '100%'
                            }}
                          />
                        </div>
                      </div>

                      {invError && (
                        <div style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 'var(--radius-md)', padding: 12, color: '#ef5350', fontSize: '0.85rem', fontWeight: 600 }}>
                          ⚠️ {invError}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                        <button
                          type="button"
                          onClick={() => setIsInventoryModalOpen(false)}
                          className="btn-outline"
                          style={{ padding: '10px 24px', borderColor: 'rgba(255,255,255,0.15)' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={invSubmitting}
                          className="btn-primary"
                          style={{ padding: '10px 32px', borderRadius: 'var(--radius-full)' }}
                        >
                          {invSubmitting ? 'Saving...' : 'Save Item'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>`;

const replaceWorkersEnd = `              </div>
            )}

${inventoryTabJsx}
${complaintsTabJsx}

        </div>`;

// Check if workers end matches
if (content.includes(searchWorkersEnd)) {
  content = content.replace(searchWorkersEnd, replaceWorkersEnd);
  console.log('Successfully patched active tabs in admin page!');
} else {
  // Let's do a more robust match if spaces or indentation differ slightly
  console.error('Could not find workers end block target!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished patch script!');
