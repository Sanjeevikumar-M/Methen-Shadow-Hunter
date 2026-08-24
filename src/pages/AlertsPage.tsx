import { Bell, ShieldAlert, Send, Clock, CheckCircle2, AlertTriangle, Building2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const MOCK_NOTIFICATIONS = [
  {
    id: "ALT-20260312-001",
    timestamp: "10 minutes ago",
    status: "Transmitted",
    level: "Critical",
    location: "ONGC Gandhar, Gujarat",
    emission: "520 kg/hr",
    authorities: ["Gujarat Pollution Control Board (GPCB)", "MoEFCC Western Regional Office"],
    details: "Sustained super-emitter event detected over 3 orbital passes. Plume length exceeds 14km. Immediate field inspection recommended."
  },
  {
    id: "ALT-20260311-042",
    timestamp: "18 hours ago",
    status: "Acknowledged",
    level: "High",
    location: "Digboi Refinery, Assam",
    emission: "185 kg/hr",
    authorities: ["Assam Pollution Control Board"],
    details: "Elevated methane concentration (+8.4% above regional baseline). Source localized to sector 4 processing units."
  },
  {
    id: "ALT-20260310-112",
    timestamp: "2 days ago",
    status: "Resolved",
    level: "Moderate",
    location: "Mumbai High Offshore, Maharashtra",
    emission: "95 kg/hr",
    authorities: ["Maharashtra Pollution Control Board (MPCB)", "Directorate General of Hydrocarbons"],
    details: "Intermittent venting detected during routine maintenance window. Levels returning to nominal baseline."
  }
];

export default function AlertsPage() {
  return (
    <div className="page-container">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md gradient-red flex items-center justify-center">
            <Bell className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-xs font-semibold text-red-500 tracking-wider uppercase">Authority Comm-Link</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
          Automated Alert System
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          A verifiable log of high-risk emission events and the simulated automated notifications transmitted to regional environmental protection agencies.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: System Status */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Notification Routing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">API Connection</span>
                  <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Active Webhooks</span>
                  <span className="text-sm font-mono font-bold text-foreground">14</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Rules Triggered (24h)</span>
                  <span className="text-sm font-mono font-bold text-red-400">1</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                Registered Agencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-start gap-2 border-b border-border/50 pb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>Central Pollution Control Board (CPCB)</span>
                </li>
                <li className="flex items-start gap-2 border-b border-border/50 pb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>Ministry of Environment, Forest and Climate Change (MoEFCC)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>14 State-Level Pollution Control Boards</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Transmission Log */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Transmission Log</h3>
          
          <div className="space-y-4">
            {MOCK_NOTIFICATIONS.map((note) => (
              <Card key={note.id} className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden relative group">
                {note.level === "Critical" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                )}
                {note.level === "High" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                )}
                {note.level === "Moderate" && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
                )}
                <CardContent className="p-5 pl-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`
                          uppercase font-bold text-[10px]
                          ${note.level === "Critical" ? "text-red-400 border-red-500/30 bg-red-500/10" : ""}
                          ${note.level === "High" ? "text-orange-400 border-orange-500/30 bg-orange-500/10" : ""}
                          ${note.level === "Moderate" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" : ""}
                        `}>
                          {note.level} Risk
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {note.timestamp}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground ml-auto bg-secondary/50 px-2 py-0.5 rounded">
                          {note.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</p>
                          <p className="font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            {note.location}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Est. Emission Rate</p>
                          <p className={`font-mono font-bold text-sm mt-0.5 ${note.level === "Critical" ? "text-red-400" : "text-foreground"}`}>
                            {note.emission}
                          </p>
                        </div>
                      </div>

                      <div className="bg-black/20 p-3 rounded-md border border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Send className="w-3 w-3" /> Authorities Notified
                        </p>
                        <ul className="text-xs text-foreground font-medium space-y-1">
                          {note.authorities.map(auth => (
                            <li key={auth}>• {auth}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground/90">{note.details}</p>
                      </div>
                    </div>

                    <div className="shrink-0 md:pl-4 md:border-l border-border/50 flex flex-row md:flex-col items-center justify-between md:justify-start gap-2 h-full min-w-[120px]">
                      <div className="text-center w-full">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                        <div className={`
                          flex flex-col items-center justify-center py-2 rounded-md bg-secondary/30 border border-secondary
                          ${note.status === "Transmitted" ? "text-blue-400" : ""}
                          ${note.status === "Acknowledged" ? "text-purple-400" : ""}
                          ${note.status === "Resolved" ? "text-green-400" : ""}
                        `}>
                          {note.status === "Transmitted" && <Send className="w-4 h-4 mb-1" />}
                          {note.status === "Acknowledged" && <AlertTriangle className="w-4 h-4 mb-1" />}
                          {note.status === "Resolved" && <CheckCircle2 className="w-4 h-4 mb-1" />}
                          <span className="text-xs font-bold uppercase">{note.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
