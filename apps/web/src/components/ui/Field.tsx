export default function Field({ label, ...p }: any) { return <label style={{ display: "grid", gap: 4 }}>{label}<input {...p} /></label>; }
