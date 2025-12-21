import React from "react";

export default function NewPlotsGrid() {
  const layout = [
    { letter: 'A', width200: 4, hasGap: false },
    { letter: 'B', width200: 4, hasGap: false },
    { letter: 'C', width200: 4, hasGap: false },
    { letter: 'D', width200: 2, hasGap: false },
    { letter: 'E', width200: 2, hasGap: false },
    { letter: 'F', width200: 2, hasGap: false },
    { letter: 'G', width200: 2, hasGap: false },
    { letter: 'H', width200: 1, hasGap: true }, // 23ft gap after H
    { letter: 'I', width200: 4, hasGap: false },
    { letter: 'J', width200: 4, hasGap: false },
    { letter: 'K', width200: 4, hasGap: false },
    { letter: 'L', width200: 4, hasGap: false },
  ];

  const renderPlots = (letter, series, cols) => {
    const cells = [];
    let count = 1;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 8; r++) {
        const label = `${letter}${series + count}`;
        cells.push(
          <div key={`${letter}-${series}-${count}`} className="plot">
            {label}
          </div>
        );
        count++;
      }
    }
    return cells;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-auto">
      <style>{`
        .npfr { 
          --plot-w: 22px; 
          --plot-h: 35px; 
          --alley-2ft: 8px;
          --road-15ft: 60px;
          --road-23ft: 90px;
          --border-col: #333;
          display: flex; gap: 50px; 
        }
        .npfr .west-side { display: flex; flex-direction: column; justify-content: center; }
        .npfr .church-box { width: 180px; height: 100px; border: 2px solid #666; display: flex; align-items: center; justify-content: center; font-weight: bold; background: #fff; transform: rotate(-5deg); box-shadow: 4px 4px 10px rgba(0,0,0,0.1); }

        .npfr .cemetery-container { display: flex; flex-direction: column-reverse; align-items: flex-start; }
        .npfr .section-row { display: flex; flex-direction: row-reverse; margin-bottom: 4px; position: relative; }
        .npfr .grid-block { display: grid; grid-auto-flow: column; grid-template-rows: repeat(8, var(--plot-h)); border: 2px solid var(--border-col); background: #fff; }

        .npfr .plot { width: var(--plot-w); height: var(--plot-h); border: 0.5px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: bold; color: #444; }

        .npfr .alley-v { width: var(--alley-2ft); }
        .npfr .gap-15 { width: var(--road-15ft); }
        .npfr .gap-23 { height: var(--road-23ft); width: 100%; }

        .npfr .w-4 { grid-template-columns: repeat(4, var(--plot-w)); }
        .npfr .w-2 { grid-template-columns: repeat(2, var(--plot-w)); }
        .npfr .w-1 { grid-template-columns: repeat(1, var(--plot-w)); }
        .npfr .label { position: absolute; right: -30px; top: 50%; transform: translateY(-50%); font-weight: bold; }
      `}</style>

      <div className="npfr">
        <div className="west-side">
          <div className="church-box">CHURCH</div>
        </div>

        <div className="cemetery-container">
          {layout.map(({ letter, width200, hasGap }) => (
            <React.Fragment key={letter}>
              <div className="section-row">
                {/* 100 Series (Right Side) */}
                <div className="grid-block w-4">
                  {renderPlots(letter, 100, 4)}
                </div>
                {/* Spacer between 100 and 200 */}
                <div className={["I","J","K","L"].includes(letter) ? "gap-15" : "alley-v"} />
                {/* 200 Series (Left Side) */}
                <div className={`grid-block w-${width200}`}>
                  {renderPlots(letter, 200, width200)}
                </div>
                <span className="label">{letter}</span>
              </div>
              {hasGap && <div className="gap-23" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}