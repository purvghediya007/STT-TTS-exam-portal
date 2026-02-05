export default function ProgressChart({ data = [] }) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-2">Progress Over Time</h3>
      <div className="space-y-2 text-sm">
        {data.map((p, i) => (
          <div key={i} className="flex justify-between">
            <div>{new Date(p.date).toLocaleDateString()}</div>
            <div>{p.percentage ?? "-"}%</div>
          </div>
        ))}
      </div>
    </section>
  );
}
