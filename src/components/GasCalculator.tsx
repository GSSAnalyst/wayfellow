import { useState } from "react";
import { money, num } from "../lib/format";

export function GasCalculator() {
  const [miles, setMiles] = useState("240");
  const [mpg, setMpg] = useState("30");
  const [gas, setGas] = useState("4.90");
  const [tolls, setTolls] = useState("0");
  const [people, setPeople] = useState(4);
  const [round, setRound] = useState(false);
  const [free, setFree] = useState(false);

  const dist = num(miles) * (round ? 2 : 1);
  const gal = num(mpg) ? dist / num(mpg) : 0;
  const fuel = gal * num(gas);
  const total = fuel + num(tolls);
  const payers = free ? Math.max(1, people - 1) : people;

  return (
    <div className="calc">
      <div className="calc-in">
        <div className="field"><label htmlFor="cMiles">Distance (miles)</label><input id="cMiles" type="number" min={1} inputMode="decimal" value={miles} onChange={e => setMiles(e.target.value)} /></div>
        <div className="field"><label htmlFor="cMpg">Car's MPG</label><input id="cMpg" type="number" min={1} step={0.5} inputMode="decimal" value={mpg} onChange={e => setMpg(e.target.value)} /></div>
        <div className="field"><label htmlFor="cGas">Gas price ($/gal)</label><input id="cGas" type="number" min={0} step={0.01} inputMode="decimal" value={gas} onChange={e => setGas(e.target.value)} /></div>
        <div className="field"><label htmlFor="cTolls">Tolls and parking ($)</label><input id="cTolls" type="number" min={0} inputMode="decimal" value={tolls} onChange={e => setTolls(e.target.value)} /></div>
        <div className="field full">
          <label htmlFor="cPeople">People in the car, driver included</label>
          <div className="range"><input id="cPeople" type="range" min={1} max={7} value={people} onChange={e => setPeople(+e.target.value)} /><output htmlFor="cPeople">{people}</output></div>
        </div>
        <label className="check"><input type="checkbox" checked={round} onChange={e => setRound(e.target.checked)} /> Round trip</label>
        <label className="check"><input type="checkbox" checked={free} onChange={e => setFree(e.target.checked)} /> Driver rides free (passengers cover it)</label>
      </div>
      <div className="calc-out" aria-live="polite">
        <div><div className="gauge">{money(total / payers)}</div><p className="gauge-label">{free && people > 1 ? "per passenger" : "per person"}, {payers} paying</p></div>
        <dl>
          <dt>Gallons</dt><dd>{gal.toFixed(1)} gal</dd>
          <dt>Gas</dt><dd>{money(fuel)}</dd>
          <dt>Tolls and parking</dt><dd>{money(num(tolls))}</dd>
          <dt>Trip total</dt><dd>{money(total)}</dd>
        </dl>
        <p className="fine">Distance ÷ MPG × gas price, plus tolls, divided by everyone paying.</p>
      </div>
    </div>
  );
}
