const payload = {
  sport: "football",
  homeTeam: "Manchester United",
  awayTeam: "Njeru FC",
  startTime: "2026-02-23T16:00:00.000Z",
  endTime: "2026-02-23T18:00:00.000Z",
};

(async () => {
  try {
    const res = await fetch("http://localhost:8080/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log(`STATUS: ${res.status}`);
    console.log(`HEADERS:\n${[...res.headers.entries()].map(h=>h.join(': ')).join('\n')}`);
    console.log('\nBODY:\n' + text);
  } catch (e) {
    console.error('Request failed:', e);
    process.exitCode = 1;
  }
})();
