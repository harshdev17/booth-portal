'use client'

import { useActionState, useState } from 'react'
import {
  ShuffleIcon,
  PlayIcon,
  CheckCircle2Icon,
  Loader2Icon,
  ShieldCheckIcon,
  InfoIcon,
  AlertTriangleIcon,
  StoreIcon,
  ListOrderedIcon,
  BanIcon
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { simulateDrawAction, executeDrawAction, type DrawActionState } from '@/app/server/draw-actions'

type CategoryItem = {
  id: number
  name: string
  slug: string
  selection_method: string
  eligibleCount: number
  availableStalls: number
}

const initialActionState: DrawActionState = {}

export default function DrawDashboardControl({
  categories,
  canRunDraw
}: {
  categories: CategoryItem[]
  canRunDraw: boolean
}) {
  const [selectedCatId, setSelectedCatId] = useState<number>(categories[0]?.id ?? 0)
  const [clientSeed, setClientSeed] = useState<string>('IGM-COMMITTEE-' + new Date().toISOString().slice(0, 10))
  const [activeTab, setActiveTab] = useState<'simulate' | 'execute'>('simulate')
  const [allowWaitlist, setAllowWaitlist] = useState<boolean>(true)
  const [waitlistRatio, setWaitlistRatio] = useState<number>(0.5)

  const [simState, simFormAction, isSimPending] = useActionState(simulateDrawAction, initialActionState)
  const [execState, execFormAction, isExecPending] = useActionState(executeDrawAction, initialActionState)

  const selectedCategory = categories.find(c => c.id === selectedCatId) || categories[0]
  const calculatedWaitlistMax = allowWaitlist
    ? Math.max(0, Math.floor((selectedCategory?.availableStalls ?? 0) * waitlistRatio))
    : 0

  return (
    <div className='flex flex-col gap-6'>
      {/* Category selector & Live metrics */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card className='md:col-span-1 shadow-xs border-slate-200'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-bold text-[#0c2847]'>1. Select Category</CardTitle>
            <CardDescription className='text-xs'>Choose booth/stall category to run draw for</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={selectedCatId}
              onChange={e => setSelectedCatId(Number(e.target.value))}
              aria-label='Select Category'
              className='w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#0c2847]'
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.selection_method})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Live Pool Metrics */}
        <Card className='shadow-xs border-slate-200 bg-blue-50/40'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
              Eligible Candidates (Approved)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline justify-between'>
              <span className='text-3xl font-extrabold text-[#0c2847]'>
                {selectedCategory?.eligibleCount ?? 0}
              </span>
              <Badge variant='outline' className='text-xs bg-white text-emerald-800 border-emerald-200'>
                Approved for Draw
              </Badge>
            </div>
            <p className='text-[11px] text-slate-500 mt-1'>
              Approved applicants eligible to be included in this round
            </p>
          </CardContent>
        </Card>

        <Card className='shadow-xs border-slate-200 bg-emerald-50/40'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
              Available Physical Booths/Stalls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline justify-between'>
              <span className='text-3xl font-extrabold text-emerald-800'>
                {selectedCategory?.availableStalls ?? 0}
              </span>
              <Badge variant='outline' className='text-xs bg-white text-emerald-800 border-emerald-200'>
                Inventory Units
              </Badge>
            </div>
            <p className='text-[11px] text-slate-500 mt-1'>
              Ready to be allotted in this draw execution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Control Tabs: Simulate vs Execute */}
      <div className='flex border-b border-slate-200'>
        <button
          type='button'
          onClick={() => setActiveTab('simulate')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'simulate'
              ? 'border-[#0c2847] text-[#0c2847]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dry-Run Simulation Mode
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('execute')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'execute'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Official Draw Execution
        </button>
      </div>

      {/* Tab 1: Simulation Form */}
      {activeTab === 'simulate' && (
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='border-b bg-slate-50/60 py-4 px-6'>
            <CardTitle className='text-base font-bold text-[#0c2847] flex items-center gap-2'>
              <ShuffleIcon className='size-4 text-blue-600' />
              Provably Fair Simulation Test (Safe / Read-Only)
            </CardTitle>
            <CardDescription className='text-xs text-slate-500'>
              Simulate the deterministic shuffle in-memory. No booths/stalls will be locked, and no applicant status will change.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-6'>
            <form action={simFormAction} className='space-y-5'>
              <input type='hidden' name='categoryId' value={selectedCatId} />
              <input type='hidden' name='allowWaitlist' value={allowWaitlist ? 'true' : 'false'} />
              <input type='hidden' name='waitlistRatio' value={allowWaitlist ? waitlistRatio.toString() : '0'} />

              {simState.error && (
                <Alert variant='destructive'>
                  <AlertDescription>{simState.error}</AlertDescription>
                </Alert>
              )}

              {simState.success && (
                <Alert className='bg-emerald-50 text-emerald-900 border-emerald-200'>
                  <CheckCircle2Icon className='size-4 text-emerald-600' />
                  <AlertDescription className='font-semibold'>{simState.success}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className='block text-xs font-semibold text-slate-700 mb-1'>
                  Public Client Entropy / Seed*
                </label>
                <Input
                  name='clientSeed'
                  value={clientSeed}
                  onChange={e => setClientSeed(e.target.value)}
                  placeholder='e.g. BTC-BLOCK-894120 or Committee Timestamp'
                  required
                  className='h-10 text-sm font-mono'
                />
                <span className='text-[11px] text-slate-400 mt-0.5 block'>
                  Combined with server-generated seed for HMAC-SHA256 deterministic shuffle.
                </span>
              </div>

              {/* Waiting List Settings Card */}
              <div className='p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <div className='text-xs font-bold text-slate-800 flex items-center gap-2'>
                      <ListOrderedIcon className='size-4 text-blue-600' />
                      <span>Waitlist Policy (प्रतीक्षा सूची नियम)</span>
                      <Badge
                        variant='outline'
                        className={
                          allowWaitlist
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                            : 'bg-slate-100 text-slate-600 border-slate-200 text-[10px]'
                        }
                      >
                        {allowWaitlist ? 'Waitlist Enabled' : 'Waitlist Disabled'}
                      </Badge>
                    </div>
                    <p className='text-[11px] text-slate-500 mt-1'>
                      {allowWaitlist
                        ? 'Eligible applicants who do not win direct allotments will be placed on a provably fair waiting list.'
                        : 'Admin has disabled waiting list. Applicants beyond available booths/stalls will remain unallotted.'}
                    </p>
                  </div>

                  <button
                    type='button'
                    onClick={() => setAllowWaitlist(!allowWaitlist)}
                    aria-label='Toggle Waitlist'
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0c2847] ${
                      allowWaitlist ? 'bg-[#0c2847]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        allowWaitlist ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {allowWaitlist ? (
                  <div className='pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                    <div className='flex items-center gap-2'>
                      <label className='text-xs font-semibold text-slate-700 whitespace-nowrap'>
                        Waitlist Capacity:
                      </label>
                      <select
                        value={waitlistRatio}
                        onChange={e => setWaitlistRatio(Number(e.target.value))}
                        aria-label='Waitlist Buffer Ratio'
                        className='h-8 text-xs rounded-md border border-slate-300 bg-white px-2.5 font-medium'
                      >
                        <option value={0.25}>25% of stalls ({Math.max(1, Math.floor((selectedCategory?.availableStalls ?? 0) * 0.25))} spots)</option>
                        <option value={0.5}>50% of stalls ({Math.max(1, Math.floor((selectedCategory?.availableStalls ?? 0) * 0.5))} spots) - Recommended</option>
                        <option value={0.75}>75% of stalls ({Math.max(1, Math.floor((selectedCategory?.availableStalls ?? 0) * 0.75))} spots)</option>
                        <option value={1.0}>100% of stalls ({selectedCategory?.availableStalls ?? 0} spots)</option>
                      </select>
                    </div>
                    <span className='text-[11px] text-slate-500'>
                      If an allotted applicant declines, booth/stall passes sequentially to Waitlist #1, #2, etc.
                    </span>
                  </div>
                ) : (
                  <div className='pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-1.5'>
                    <BanIcon className='size-3.5 text-slate-400' />
                    <span>No waiting list candidates will be recorded. Extra candidates will be labeled Unallotted.</span>
                  </div>
                )}
              </div>

              <div className='pt-2 flex justify-end'>
                <Button
                  type='submit'
                  disabled={isSimPending || (selectedCategory?.eligibleCount ?? 0) === 0}
                  className='bg-[#0c2847] hover:bg-[#12365c] text-white font-semibold flex items-center gap-2'
                >
                  {isSimPending ? <Loader2Icon className='size-4 animate-spin' /> : <ShuffleIcon className='size-4' />}
                  Run Dry-Run Simulation
                </Button>
              </div>
            </form>

            {/* Simulation Results Preview Table */}
            {simState.data?.allocations && (
              <div className='mt-6 pt-6 border-t border-slate-200'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-bold text-slate-900'>
                    Simulated Output: {simState.data.allottedCount} Allotted, {simState.data.waitlistCount} Waitlisted
                    {simState.data.unallocatedCount ? `, ${simState.data.unallocatedCount} Unallotted` : ''}
                  </h4>
                  <Badge variant='outline' className='text-xs font-mono'>
                    Seed Hash: {simState.data.serverSeedHash.slice(0, 16)}...
                  </Badge>
                </div>

                <div className='rounded-lg border border-slate-200 overflow-x-auto max-h-96'>
                  <table className='w-full text-left text-xs'>
                    <thead className='bg-slate-100 font-bold text-slate-600 sticky top-0'>
                      <tr>
                        <th className='py-2.5 px-3'>Pos</th>
                        <th className='py-2.5 px-3'>App Number</th>
                        <th className='py-2.5 px-3'>Candidate Name</th>
                        <th className='py-2.5 px-3'>Assigned Booth/Stall</th>
                        <th className='py-2.5 px-3'>Result Type</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {simState.data.allocations.map((a: any) => (
                        <tr key={a.drawPosition} className='hover:bg-slate-50'>
                          <td className='py-2 px-3 font-mono font-bold'>{a.drawPosition}</td>
                          <td className='py-2 px-3 font-mono'>{a.applicationNumber}</td>
                          <td className='py-2 px-3 font-medium'>{a.representativeName}</td>
                          <td className='py-2 px-3 font-mono'>
                            {a.stallNumber ? (
                              <span className='font-bold text-blue-900'>Stall #{a.stallNumber}</span>
                            ) : a.type === 'waitlist' ? (
                              <span className='text-amber-700 font-medium'>Waitlist #{a.waitlistPosition}</span>
                            ) : (
                              <span className='text-slate-400 italic'>None (Unallotted)</span>
                            )}
                          </td>
                          <td className='py-2 px-3'>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                a.type === 'allotted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : a.type === 'waitlist'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {a.type === 'allotted'
                                ? 'Allotted Winner'
                                : a.type === 'waitlist'
                                ? `Waitlist #${a.waitlistPosition}`
                                : 'Unallotted'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Execution Form */}
      {activeTab === 'execute' && (
        <Card className='shadow-xs border-emerald-200 bg-emerald-50/10'>
          <CardHeader className='border-b bg-emerald-50/50 py-4 px-6'>
            <CardTitle className='text-base font-bold text-emerald-950 flex items-center gap-2'>
              <ShieldCheckIcon className='size-5 text-emerald-600' />
              Official Live Draw Execution
            </CardTitle>
            <CardDescription className='text-xs text-slate-600'>
              WARNING: Executing the draw will lock physical inventory units, snapshot all candidates, and commit final allotments.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-6'>
            {!canRunDraw ? (
              <Alert variant='destructive'>
                <AlertTriangleIcon className='size-4' />
                <AlertDescription>
                  You do not have permission (`draw:run`) to execute live draws. Contact your Super Admin.
                </AlertDescription>
              </Alert>
            ) : (
              <form action={execFormAction} className='space-y-5'>
                <input type='hidden' name='categoryId' value={selectedCatId} />
                <input type='hidden' name='allowWaitlist' value={allowWaitlist ? 'true' : 'false'} />
                <input type='hidden' name='waitlistRatio' value={allowWaitlist ? waitlistRatio.toString() : '0'} />

                {execState.error && (
                  <Alert variant='destructive'>
                    <AlertDescription>{execState.error}</AlertDescription>
                  </Alert>
                )}

                {execState.success && (
                  <Alert className='bg-emerald-100 text-emerald-900 border-emerald-300'>
                    <CheckCircle2Icon className='size-4 text-emerald-700' />
                    <AlertDescription className='font-bold'>{execState.success}</AlertDescription>
                  </Alert>
                )}

                <div className='p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3'>
                  <AlertTriangleIcon className='size-5 text-amber-600 shrink-0 mt-0.5' />
                  <div>
                    <strong className='font-bold block'>Committee Protocol Notice:</strong>
                    This action is permanent and auditable under Right to Information (RTI). Once committed, an immutable snapshot is sealed in the database. Ensure committee members have witnessed the seed before clicking Execute.
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-semibold text-slate-700 mb-1'>
                      Public Client Seed / Entropy*
                    </label>
                    <Input
                      name='clientSeed'
                      value={clientSeed}
                      onChange={e => setClientSeed(e.target.value)}
                      required
                      className='h-10 text-sm font-mono'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-slate-700 mb-1'>
                      Committee Notes / Witness Names
                    </label>
                    <Input
                      name='notes'
                      placeholder='e.g. Presided by Committee Chairman, DC Kurukshetra'
                      className='h-10 text-sm'
                    />
                  </div>
                </div>

                {/* Waiting List Policy Controls for Live Execution */}
                <div className='p-4 rounded-xl border border-emerald-200 bg-white space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='text-xs font-bold text-slate-800 flex items-center gap-2'>
                        <ListOrderedIcon className='size-4 text-emerald-600' />
                        <span>Execution Waitlist Policy</span>
                        <Badge
                          variant='outline'
                          className={
                            allowWaitlist
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]'
                              : 'bg-slate-100 text-slate-600 border-slate-200 text-[10px]'
                          }
                        >
                          {allowWaitlist ? 'Waitlist Active' : 'No Waitlist'}
                        </Badge>
                      </div>
                      <p className='text-[11px] text-slate-500 mt-1'>
                        {allowWaitlist
                          ? `Up to ${calculatedWaitlistMax} candidates will be officially waitlisted in case winners forfeit.`
                          : 'No candidates will be put on waitlist for this round.'}
                      </p>
                    </div>

                    <button
                      type='button'
                      onClick={() => setAllowWaitlist(!allowWaitlist)}
                      aria-label='Toggle Waitlist'
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                        allowWaitlist ? 'bg-emerald-700' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          allowWaitlist ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {allowWaitlist && (
                    <div className='pt-2 border-t border-slate-100 flex items-center gap-3'>
                      <label className='text-xs font-semibold text-slate-700 whitespace-nowrap'>
                        Waitlist Buffer:
                      </label>
                      <select
                        value={waitlistRatio}
                        onChange={e => setWaitlistRatio(Number(e.target.value))}
                        aria-label='Select waitlist ratio'
                        className='h-8 text-xs rounded-md border border-slate-300 bg-white px-2.5 font-medium'
                      >
                        <option value={0.25}>25% Extra Waitlist Quota</option>
                        <option value={0.5}>50% Extra Waitlist Quota (Standard)</option>
                        <option value={0.75}>75% Extra Waitlist Quota</option>
                        <option value={1.0}>100% Extra Waitlist Quota</option>
                      </select>
                      <span className='text-xs text-slate-600 font-medium'>
                        = Max {calculatedWaitlistMax} waitlist candidate(s)
                      </span>
                    </div>
                  )}
                </div>

                <div className='pt-2 flex justify-end'>
                  <Button
                    type='submit'
                    disabled={isExecPending || (selectedCategory?.eligibleCount ?? 0) === 0}
                    className='bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-2 px-6'
                  >
                    {isExecPending ? (
                      <Loader2Icon className='size-4 animate-spin' />
                    ) : (
                      <PlayIcon className='size-4' />
                    )}
                    Commit & Execute Live Draw
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
