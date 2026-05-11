import type { Layer1Result } from '../../types'

function formatLineItemValue(value: number): string {
  if (value === 0) return '—'
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value < 0 ? `(${formatted})` : formatted
}

interface Layer1ResultsTableProps {
  result: Layer1Result
  label?: string
}

export default function Layer1ResultsTable({ result, label }: Layer1ResultsTableProps) {
  return (
    <div>
      {label && (
        <p className="text-[11px] text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>
          {label}
        </p>
      )}
      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
        <span>
          Scaling:{' '}
          <span style={{ fontWeight: 500 }} className="text-foreground">
            {result.sourceScaling}
          </span>
        </span>
        <span>
          Column:{' '}
          <span style={{ fontWeight: 500 }} className="text-foreground">
            {result.columnIdentified}
          </span>
        </span>
        <span>
          Items:{' '}
          <span style={{ fontWeight: 500 }} className="text-foreground">
            {Object.keys(result.lineItems).length}
          </span>
        </span>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1.5 px-2 text-muted-foreground" style={{ fontWeight: 500 }}>
              Line Item
            </th>
            <th className="text-right py-1.5 px-2 text-muted-foreground" style={{ fontWeight: 500 }}>
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(result.lineItems).map(([lineLabel, value], i) => {
            const isBold =
              lineLabel.includes('Total') ||
              lineLabel.includes('Gross') ||
              lineLabel.includes('Net') ||
              lineLabel.includes('Operating Income') ||
              lineLabel.includes('Pre-Tax')
            return (
              <tr key={i} className={`border-b border-gray-100 ${isBold ? 'bg-gray-50/50' : ''}`}>
                <td className="py-1.5 px-2" style={{ fontWeight: isBold ? 500 : 400 }}>
                  {lineLabel}
                </td>
                <td className={`py-1.5 px-2 text-right font-mono ${value < 0 ? 'text-red-600' : ''}`}>
                  {formatLineItemValue(value)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
