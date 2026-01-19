import { headers } from 'next/headers';

// Real Data Fetcher (Server Component)
async function getDecisions() {
    try {
        // Default to local Core
        const API_URL = process.env.CORE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${API_URL}/admin/decisions`, { 
            headers: { Authorization: "Bearer sk-admin-abs-v0" },
            cache: 'no-store'
        });
        
        if (!res.ok) {
            console.error('Failed to fetch logs:', res.statusText);
            return { data: [] };
        }
        return res.json();
    } catch (e) {
        console.error('Connection error:', e);
        return { data: [] };
    }
}

type LogEntry = {
  decision_id: string;
  created_at: string;
  trace_id: string;
  execution_status: string;
  decision_payload: {
    decision_proposal?: {
      recommended_action: string;
    }
  }
};

export default async function Home() {
  const { data: logs } = await getDecisions();
  
  return (
    <div className="space-y-6">
      <header>
          <h1 className="text-3xl font-bold text-white">Governance Audit Log</h1>
          <p className="text-slate-400">Real-time stream of AI decision gates.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Total Decisions" value={logs.length} />
          <Card title="Policy Rejections" value={logs.filter((l: LogEntry) => l.execution_status === 'DENIED').length} color="text-red-400" />
          <Card title="Active Incidents" value="None" color="text-green-400" />
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden bg-slate-900/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase font-medium">
                <tr>
                    <th className="p-4">Time</th>
                    <th className="p-4">Trace ID</th>
                    <th className="p-4">Proposal</th>
                    <th className="p-4">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {logs.length === 0 ? (
                    <tr>
                        <td className="p-4 text-slate-500" colSpan={4}>
                            No decisions found. Run `abs simulate` to generate traffic.
                        </td>
                    </tr>
                ) : (
                    logs.map((log: LogEntry) => (
                        <tr key={log.decision_id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 text-slate-300 font-mono">
                                {new Date(log.created_at).toLocaleTimeString()}
                            </td>
                            <td className="p-4 text-slate-500 font-mono text-xs">
                                {log.trace_id.slice(0, 8)}...
                            </td>
                            <td className="p-4 text-slate-300">
                                {log.decision_payload?.decision_proposal?.recommended_action || 'Unknown Action'}
                            </td>
                            <td className="p-4">
                                <Badge status={log.execution_status || 'PENDING'} />
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
          </table>
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        'SUCCESS': 'bg-green-500/10 text-green-400 border-green-500/20',
        'DENIED': 'bg-red-500/10 text-red-400 border-red-500/20',
        'PENDING': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[status] || 'bg-slate-800 text-slate-400'}`}>
            {status}
        </span>
    );
}

function Card({ title, value, color = "text-white" }: { title: string, value: string | number, color?: string }) {
    return (
        <div className="p-6 rounded-lg bg-slate-800 border border-white/5">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</h3>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
        </div>
    )
}
