export default ({ feedback }) => (
  <div>
    {feedback.map((f, i) => (
      <div key={i} className="card">
        {f}
      </div>
    ))}
  </div>
);
