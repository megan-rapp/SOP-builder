import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Flower2, Printer, ShieldCheck } from "lucide-react";
import { categories, sopTemplates, type SopTemplate } from "./data";

type Props = { onExit: () => void };

function DemoWorkspace({ onExit }: Props) {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All procedures");
  const [selectedSop, setSelectedSop] = useState<SopTemplate | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<number[]>([]);
  const demoTemplates = sopTemplates.filter((sop) => [
    "new-patient",
    "appointment-confirmation",
    "patient-check-in",
    "insurance-entry",
    "treatment-estimate",
    "checkout",
  ].includes(sop.id));
  const filteredTemplates = demoTemplates.filter((sop) =>
    activeCategory === "All procedures" || sop.category === activeCategory,
  );

  function openTemplate(sop: SopTemplate) {
    setSelectedSop(sop);
    setSelectedSteps(sop.steps.map((_, index) => index));
    setSelectedPrerequisites((sop.prerequisites || []).map((_, index) => index));
  }

  function toggleStep(index: number) {
    setSelectedSteps((current) =>
      current.includes(index) ? current.filter((step) => step !== index) : [...current, index].sort((a, b) => a - b),
    );
  }

  return (
    <div className="demo-shell">
      <header className="demo-topbar">
        <a className="brand demo-brand" href="#" onClick={(event) => { event.preventDefault(); setSelectedSop(null); }} aria-label="Demo home">
          <img className="tdo-brand-logo" src="/images/tdo-logo.png" alt="TDO Software" />
          <span className="brand-mark"><Flower2 size={19} strokeWidth={1.8} /></span>
          <span className="brand-name">endo<span>sop</span><small>STUDIO</small></span>
        </a>
        <span className="demo-badge"><ShieldCheck size={14} /> READ-ONLY DEMO</span>
        <button className="demo-exit" onClick={onExit}>Back to sign in <ArrowRight size={15} /></button>
      </header>

      <main className="demo-main">
        {selectedSop ? (
          <section className="demo-detail">
            <button className="demo-back" onClick={() => setSelectedSop(null)}><ArrowLeft size={15} /> All demo templates</button>
            <div className="demo-detail-heading">
              <span className="eyebrow"><span className="category-dot" /> {selectedSop.category.toUpperCase()} · DEMO TEMPLATE</span>
              <h1>{selectedSop.title}</h1>
              <p>{selectedSop.description}</p>
            </div>
            <div className="demo-checklist">
              {(selectedSop.prerequisites || []).length > 0 && (
                <section className="demo-prerequisites">
                  <div className="demo-checklist-head"><div><h2>Prerequisites · one-time setup</h2><p>Complete these setup items before following this procedure.</p></div><span>{selectedPrerequisites.length} of {selectedSop.prerequisites?.length || 0} selected</span></div>
                  <div className="demo-step-list">
                    {selectedSop.prerequisites?.map((step, index) => (
                      <label className="demo-step" key={`prerequisite-${selectedSop.id}-${index}`}>
                        <input type="checkbox" checked={selectedPrerequisites.includes(index)} onChange={() => setSelectedPrerequisites((current) =>
                          current.includes(index) ? current.filter((stepIndex) => stepIndex !== index) : [...current, index].sort((a, b) => a - b),
                        )} />
                        <span className="demo-step-number">{String(index + 1).padStart(2, "0")}</span>
                        <span>{step}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}
              <div className="demo-checklist-head"><div><h2>Customize your checklist</h2><p>Select the steps your office uses. This demo does not save changes.</p></div><span>{selectedSteps.length} of {selectedSop.steps.length} selected</span></div>
              <div className="demo-step-list">
                {selectedSop.steps.map((step, index) => (
                  <label className="demo-step" key={`${selectedSop.id}-${index}`}>
                    <input type="checkbox" checked={selectedSteps.includes(index)} onChange={() => toggleStep(index)} />
                    <span className="demo-step-number">{String(index + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </label>
                ))}
              </div>
              <button className="button-primary demo-print-button" onClick={() => window.print()} disabled={selectedSteps.length === 0}>
                <Printer size={16} /> Print / Save as PDF
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="demo-hero">
              <span className="welcome-badge"><CheckCircle2 size={13} /> EXPLORE THE WORKFLOW</span>
              <h1>See how your SOPs<br /><span>come together.</span></h1>
              <p>Browse sample front-office checklists, customize steps, and preview a print-ready SOP. No account or patient data needed.</p>
            </section>
            <div className="demo-library-heading">
              <div><span className="eyebrow"><span className="category-dot" /> SAMPLE WORKFLOWS</span><h2>Patient journey templates <span>{filteredTemplates.length}</span></h2></div>
              <div className="filter-tabs demo-filter-tabs" role="tablist" aria-label="Filter demo templates">
                {(["All procedures", "Front office"] as const).map((category) => (
                  <button key={category} role="tab" aria-selected={activeCategory === category} className={`filter-tab ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}>{category}</button>
                ))}
              </div>
            </div>
            <div className="demo-template-grid">
              {filteredTemplates.map((sop, index) => (
                <button className="sop-card" key={sop.id} onClick={() => openTemplate(sop)}>
                  <div className={`card-icon card-icon-${index % 4}`}><CheckCircle2 size={19} strokeWidth={1.8} /></div>
                  <div className="card-category">{sop.category}<span className="category-dot small" /></div>
                  <h3>{sop.title}</h3>
                  <p>{sop.description}</p>
                  <div className="card-bottom"><span>{sop.steps.length} steps</span><span className="card-open">Preview <ArrowRight size={14} /></span></div>
                </button>
              ))}
            </div>
          </>
        )}
        <p className="demo-disclaimer">Demo templates are editable starting points, not official TDO guidance. Confirm workflows against current documentation, privacy requirements, payer rules, and your office policies.</p>
      </main>

      {selectedSop && (
        <div className="demo-print">
          <header className="demo-print-header">
            <img src="/images/tdo-logo.png" alt="TDO Software" />
            <span>STANDARD OPERATING PROCEDURE · DEMO</span>
          </header>
          <h1>{selectedSop.title}</h1>
          <p>{selectedSop.description}</p>
          {(selectedSop.prerequisites || []).some((_, index) => selectedPrerequisites.includes(index)) && <>
            <h2>PREREQUISITES · ONE-TIME SETUP</h2>
            <ol>{selectedSop.prerequisites?.map((step, index) => selectedPrerequisites.includes(index) && <li key={`prerequisite-${index}`}>{step}</li>)}</ol>
          </>}
          <h2>PROCEDURE</h2>
          <ol>{selectedSop.steps.map((step, index) => selectedSteps.includes(index) && <li key={`${selectedSop.id}-print-${index}`}>{step}</li>)}</ol>
          <footer>Endo SOP Studio · Demo template · Verify local policy before implementation</footer>
        </div>
      )}
    </div>
  );
}

export default DemoWorkspace;
