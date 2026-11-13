import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Flower2,
  FolderOpen,
  GripVertical,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { categories, sopTemplates, type SopCategory, type SopTemplate } from "./data";
import { extractSopText, parseSopText } from "./lib/importSop";

const TDO_KB_URL = "https://kb.tdo4endo.com/";
const TDO_LMS_URL = "https://lms.tdos.dental/dashboard";
type DemoView = "library" | "builder" | "knowledge";

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function DemoWorkspace({ onExit }: { onExit: () => void }) {
  const [demoSops, setDemoSops] = useState(sopTemplates);
  const [activeView, setActiveView] = useState<DemoView>("library");
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All procedures");
  const [query, setQuery] = useState("");
  const [selectedSop, setSelectedSop] = useState<SopTemplate | null>(null);
  const [builderOriginal, setBuilderOriginal] = useState<SopTemplate | null>(null);
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderDepartment, setBuilderDepartment] = useState("");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderPrerequisites, setBuilderPrerequisites] = useState<string[]>([""]);
  const [builderSteps, setBuilderSteps] = useState<string[]>([""]);
  const [builderReferenceTitle, setBuilderReferenceTitle] = useState("");
  const [builderReferenceUrl, setBuilderReferenceUrl] = useState("");
  const [builderNavigationPath, setBuilderNavigationPath] = useState("");
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedFileName, setImportedFileName] = useState("");
  const [notice, setNotice] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  const filteredSops = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return demoSops.filter((sop) => {
      const matchesCategory = activeCategory === "All procedures" || sop.category === activeCategory;
      const matchesQuery = !normalizedQuery ||
        `${sop.title} ${sop.description} ${sop.category} ${sop.steps.join(" ")} ${(sop.prerequisites || []).join(" ")}`
          .toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, demoSops, query]);

  function showLibrary(category: (typeof categories)[number] = "All procedures") {
    setActiveView("library");
    setActiveCategory(category);
    setSelectedSop(null);
    setNotice("");
  }

  function beginBuilder(sop?: SopTemplate) {
    setBuilderOriginal(sop || null);
    setBuilderTitle(sop?.title || "");
    setBuilderDepartment(sop?.department || "");
    setBuilderDescription(sop?.description || "");
    setBuilderPrerequisites(sop?.prerequisites?.length ? [...sop.prerequisites] : [""]);
    setBuilderSteps(sop?.steps.length ? [...sop.steps] : [""]);
    setBuilderReferenceTitle(sop?.reference?.title || "");
    setBuilderReferenceUrl(sop?.reference?.url || "");
    setBuilderNavigationPath(sop?.navigationPath?.join(" > ") || "");
    setImportedFileName("");
    setSelectedSop(null);
    setActiveView("builder");
    setNotice("");
  }

  function openSop(sop: SopTemplate) {
    setSelectedSop(sop);
    setSelectedSteps(sop.steps.map((_, index) => index));
    setSelectedPrerequisites((sop.prerequisites || []).map((_, index) => index));
  }

  async function importSop(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setImporting(true);
    setNotice("");
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("Choose an SOP file smaller than 15 MB.");
      const imported = parseSopText(await extractSopText(file), file.name);
      if (!imported.steps.length) {
        throw new Error("No procedure steps were found. Scanned PDFs require OCR, which is not supported.");
      }
      setBuilderOriginal(null);
      setBuilderTitle(imported.title);
      setBuilderDepartment("");
      setBuilderDescription(imported.description);
      setBuilderPrerequisites(imported.prerequisites.length ? imported.prerequisites : [""]);
      setBuilderSteps(imported.steps);
      setBuilderReferenceTitle("");
      setBuilderReferenceUrl("");
      setBuilderNavigationPath("");
      setImportedFileName(file.name);
      setSelectedSop(null);
      setActiveView("builder");
      setNotice(`Imported ${file.name}. Review and edit the content before adding it to this demo.`);
    } catch (error) {
      setNotice(error instanceof Error ? `Could not import this SOP: ${error.message}` : "Could not import this SOP.");
    } finally {
      input.value = "";
      setImporting(false);
    }
  }

  function saveDemoSop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = builderTitle.trim();
    const steps = builderSteps.map((step) => step.trim()).filter(Boolean);
    const prerequisites = builderPrerequisites.map((step) => step.trim()).filter(Boolean);
    if (!title || !steps.length) {
      setNotice("Add a title and at least one procedure step.");
      return;
    }
    let reference: SopTemplate["reference"];
    if (builderReferenceTitle.trim() || builderReferenceUrl.trim()) {
      try {
        const url = new URL(builderReferenceUrl.trim());
        if (!["http:", "https:"].includes(url.protocol) || !builderReferenceTitle.trim()) {
          setNotice("Add both a reference title and a valid web link, or leave both blank.");
          return;
        }
        reference = { title: builderReferenceTitle.trim(), url: builderReferenceUrl.trim() };
      } catch {
        setNotice("Add a valid reference link or leave both reference fields blank.");
        return;
      }
    }

    const saved: SopTemplate = {
      ...(builderOriginal || {}),
      id: builderOriginal?.id || `demo-${crypto.randomUUID()}`,
      title,
      category: builderOriginal?.category || (builderDepartment.trim() ? "Custom" : "Front office") as SopCategory,
      department: builderDepartment.trim() || undefined,
      description: builderDescription.trim() || "Demo SOP created for this session.",
      duration: `${steps.length} steps`,
      prerequisites: prerequisites.length ? prerequisites : undefined,
      steps,
      isCustom: true,
      navigationPath: builderNavigationPath.split(">").map((part) => part.trim()).filter(Boolean),
      reference,
    };
    setDemoSops((current) => builderOriginal
      ? current.map((sop) => sop.id === saved.id ? saved : sop)
      : [...current, saved]);
    setActiveCategory(saved.category);
    setActiveView("library");
    setSelectedSop(saved);
    setSelectedSteps(saved.steps.map((_, index) => index));
    setSelectedPrerequisites((saved.prerequisites || []).map((_, index) => index));
    setNotice("SOP saved to this demo session. It will not persist after you leave.");
  }

  function toggleSelection(index: number, type: "steps" | "prerequisites") {
    const setter = type === "steps" ? setSelectedSteps : setSelectedPrerequisites;
    setter((current) => current.includes(index)
      ? current.filter((value) => value !== index)
      : [...current, index].sort((a, b) => a - b));
  }

  function renderBuilderRows(
    list: string[],
    setList: (updater: (current: string[]) => string[]) => void,
    type: "steps" | "prerequisites",
  ) {
    return (
      <>
        <div className="demo-builder-step-list">
          {list.map((step, index) => (
            <div
              className="demo-builder-step-row"
              key={`${type}-${index}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.getData("application/x-sop-list") !== type) return;
                setList((current) => moveItem(current, Number(event.dataTransfer.getData("text/plain")), index));
              }}
            >
              <button
                className="demo-drag-handle"
                type="button"
                draggable
                aria-label={`Drag ${type === "steps" ? "step" : "prerequisite"} ${index + 1} to reorder`}
                title="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("application/x-sop-list", type);
                  event.dataTransfer.setData("text/plain", String(index));
                }}
              ><GripVertical size={17} /><span>Drag</span></button>
              <div className="demo-builder-step-content">
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <input
                  className="text-input"
                  aria-label={`${type === "steps" ? "Procedure step" : "Prerequisite"} ${index + 1}`}
                  placeholder={type === "steps" ? `Describe step ${index + 1}` : "Describe one-time setup"}
                  value={step}
                  onChange={(event) => setList((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                />
              </div>
              <div className="demo-builder-step-actions">
                <button className="step-action insert-step" type="button" onClick={() => setList((current) => [...current.slice(0, index + 1), "", ...current.slice(index + 1)])}><Plus size={15} /><span>Add after</span></button>
                <button className="step-action" type="button" aria-label={`Move ${type} ${index + 1} up`} disabled={index === 0} onClick={() => setList((current) => moveItem(current, index, index - 1))}><ArrowUp size={15} /><span>Move up</span></button>
                <button className="step-action" type="button" aria-label={`Move ${type} ${index + 1} down`} disabled={index === list.length - 1} onClick={() => setList((current) => moveItem(current, index, index + 1))}><ArrowDown size={15} /><span>Move down</span></button>
                <button className="step-action remove-step" type="button" aria-label={`Remove ${type} ${index + 1}`} onClick={() => setList((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : [""])}><X size={14} /><span>Remove</span></button>
              </div>
            </div>
          ))}
        </div>
        <button className="add-step-button" type="button" onClick={() => setList((current) => [...current, ""])}><Plus size={15} /> Add {type === "steps" ? "a step" : "a prerequisite"}</button>
      </>
    );
  }

  return (
    <div className="app-shell demo-app-shell">
      <aside className="sidebar demo-sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); showLibrary(); }} aria-label="Demo SOP library">
          <img className="tdo-brand-logo" src="/images/tdo-logo.png" alt="TDO Software" />
          <span className="brand-mark"><Flower2 size={19} strokeWidth={1.8} /></span>
          <span className="brand-name">endo<span>sop</span><small>STUDIO</small></span>
        </a>
        <span className="demo-badge demo-sidebar-badge"><ShieldCheck size={13} /> DEMO · NOT SAVED</span>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Demo workspace navigation">
          <button className={`nav-item ${activeView === "library" && !selectedSop ? "active" : ""}`} onClick={() => showLibrary()}>
            <LayoutDashboard size={18} /> SOP library <span className="nav-count">{demoSops.length}</span>
          </button>
          <button className={`nav-item ${activeView === "knowledge" ? "active" : ""}`} onClick={() => { setSelectedSop(null); setActiveView("knowledge"); }}>
            <BookOpen size={18} /> TDO12 resources <ArrowUpRight className="nav-external" size={15} />
          </button>
          <button className={`nav-item ${activeView === "builder" && !builderOriginal ? "active" : ""}`} onClick={() => beginBuilder()}>
            <FilePlus2 size={18} /> Build Your Own
          </button>
          <button className="nav-item" onClick={() => importInput.current?.click()} disabled={importing}>
            {importing ? <CheckCircle2 size={18} /> : <Upload size={18} />} Upload existing SOP
          </button>
        </nav>
        <div className="sidebar-label category-label">CATEGORIES</div>
        <nav className="category-nav" aria-label="Demo SOP categories">
          {categories.slice(1).map((category, index) => {
            const Icon = [HeartPulse, Activity, ShieldCheck, FolderOpen][index % 4];
            return <button key={category} className={`category-link ${activeCategory === category && activeView === "library" ? "active" : ""}`} onClick={() => showLibrary(category)}><Icon size={16} />{category}</button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card"><span className="help-icon"><Sparkles size={16} /></span><strong>Try the whole workflow</strong><p>Edit templates, import a file, or build your own SOP. Demo edits last only for this session.</p></div>
        <div className="sidebar-footer demo-sidebar-footer">
          <span className="avatar">D</span><div><strong>Demo workspace</strong><span>Changes are not saved</span></div>
          <button className="demo-exit-sidebar" onClick={onExit}>Sign in <ArrowRight size={14} /></button>
        </div>
      </aside>

      <main className="main-content demo-main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Demo</span><span className="crumb-slash">/</span><strong>{selectedSop ? selectedSop.title : activeView === "builder" ? (builderOriginal ? "Edit SOP" : "Build Your Own") : activeView === "knowledge" ? "TDO12 resources" : "SOP library"}</strong></div>
          <span className="demo-topbar-note"><ShieldCheck size={14} /> Read-only demo · edits aren't saved</span>
        </header>
        {notice && <div className="workspace-alert demo-notice" role="status"><CheckCircle2 size={16} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></div>}

        {selectedSop ? (
          <section className="editor-page">
            <button className="back-link" onClick={() => setSelectedSop(null)}><ArrowLeft size={16} /> Back to SOP library</button>
            <div className="editor-heading">
              <div><div className="eyebrow"><span className="category-dot" />{selectedSop.category} <span className="eyebrow-divider">·</span> DEMO SOP</div><h1>{selectedSop.title}</h1><p>{selectedSop.description}</p></div>
              <div className="editor-actions">
                <button className="secondary-button edit-steps-button" onClick={() => beginBuilder(selectedSop)}><FileText size={15} /> Add / edit / reorder steps</button>
                <button className="button-primary" onClick={() => window.print()} disabled={!selectedSteps.length}><ArrowDownToLine size={17} /> Generate PDF</button>
              </div>
            </div>
            <div className="editor-grid">
              <section className="steps-panel">
                {(selectedSop.prerequisites || []).length > 0 && <div className="prerequisite-checklist">
                  <div className="panel-heading prerequisite-heading"><div><h2>Prerequisites · one-time setup</h2><p>Select optional setup items to include.</p></div><span className="selection-count">{selectedPrerequisites.length} selected</span></div>
                  <div className="step-list">{selectedSop.prerequisites?.map((step, index) => <label key={`pre-${index}`} className={`step-row ${selectedPrerequisites.includes(index) ? "checked" : ""}`}><input type="checkbox" checked={selectedPrerequisites.includes(index)} onChange={() => toggleSelection(index, "prerequisites")} /><span className="custom-checkbox">{selectedPrerequisites.includes(index) && <Check size={13} />}</span><span className="step-number">{String(index + 1).padStart(2, "0")}</span><span className="step-copy">{step}</span></label>)}</div>
                </div>}
                <div className="panel-heading"><div><h2>Choose your steps</h2><p>Select the steps to include, or open the editor to change their content and order.</p></div><span className="selection-count">{selectedSteps.length} of {selectedSop.steps.length} selected</span></div>
                <div className="progress-track"><span style={{ width: `${selectedSop.steps.length ? selectedSteps.length / selectedSop.steps.length * 100 : 0}%` }} /></div>
                <div className="step-list">{selectedSop.steps.map((step, index) => <label key={`${selectedSop.id}-${index}`} className={`step-row ${selectedSteps.includes(index) ? "checked" : ""}`}><input type="checkbox" checked={selectedSteps.includes(index)} onChange={() => toggleSelection(index, "steps")} /><span className="custom-checkbox">{selectedSteps.includes(index) && <Check size={13} />}</span><span className="step-number">{String(index + 1).padStart(2, "0")}</span><span className="step-copy">{step}</span></label>)}</div>
                <div className="steps-footer"><span><CheckCircle2 size={16} /> Selections are included in the PDF.</span><button className="text-button" onClick={() => setSelectedSteps(selectedSop.steps.map((_, index) => index))}>Select all</button></div>
              </section>
              <aside className="editor-side">
                <section className="side-card reference-card"><div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>Reference library</h3><p>Verify procedures against current guidance</p></div></div><a className="resource-link" href={TDO_KB_URL} target="_blank" rel="noreferrer"><span className="resource-mark">T</span><span><strong>TDO Knowledge Base</strong><small>Browse TDO12 articles</small></span><ArrowUpRight size={15} /></a>{selectedSop.reference && <a className="resource-link" href={selectedSop.reference.url} target="_blank" rel="noreferrer"><span className="resource-mark added">↗</span><span><strong>{selectedSop.reference.title}</strong><small>SOP reference</small></span><ArrowUpRight size={15} /></a>}</section>
                <div className="editor-note"><ShieldCheck size={16} /><p>This demo uses sample workflows. Changes can be edited and printed, but are not stored after leaving the demo.</p></div>
              </aside>
            </div>
          </section>
        ) : activeView === "builder" ? (
          <section className="builder-page">
            <button className="back-link" onClick={() => showLibrary()}><ArrowLeft size={16} /> Back to SOP library</button>
            <div className="builder-intro-row"><div className="page-intro builder-intro"><div className="eyebrow"><span className="category-dot" /> DEMO EDITOR</div><h1>{builderOriginal ? "Edit SOP" : "Build Your Own"}</h1><p>Customize all fields and steps. Saved changes stay in this demo session only.</p></div>
              {!builderOriginal && <div className="builder-import-action"><input ref={importInput} className="visually-hidden" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" aria-label="Upload an existing SOP file" onChange={(event) => void importSop(event)} /><button className="secondary-button" type="button" onClick={() => importInput.current?.click()} disabled={importing}>{importing ? <CheckCircle2 size={15} /> : <Upload size={15} />}{importing ? "Reading SOP…" : "Upload existing SOP"}</button><span>PDF, DOCX, or TXT · 15 MB max</span></div>}
            </div>
            {importedFileName && <p className="imported-sop-note"><FileText size={14} /> Imported from <strong>{importedFileName}</strong>. Review the extracted content below.</p>}
            <form className="builder-form" onSubmit={saveDemoSop}>
              <section className="side-card builder-section"><div className="side-card-title"><span className="side-icon"><FileText size={17} /></span><div><h3>SOP details</h3><p>Imported and template content is fully editable.</p></div></div>
                <div className="builder-fields">
                  <div className="builder-field"><label className="field-label" htmlFor="demo-title">SOP title</label><input id="demo-title" className="text-input" value={builderTitle} onChange={(event) => setBuilderTitle(event.target.value)} required /></div>
                  <div className="builder-field"><label className="field-label" htmlFor="demo-department">Team or department</label><input id="demo-department" className="text-input" value={builderDepartment} onChange={(event) => setBuilderDepartment(event.target.value)} placeholder="e.g. Front office" /></div>
                  <div className="builder-field full"><label className="field-label" htmlFor="demo-description">Purpose</label><textarea id="demo-description" className="text-input builder-textarea" rows={2} value={builderDescription} onChange={(event) => setBuilderDescription(event.target.value)} placeholder="What should this procedure help accomplish?" /></div>
                </div>
              </section>
              <section className="side-card builder-section"><div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>Prerequisites · one-time setup</h3><p>Optional setup to complete before this procedure.</p></div></div>{renderBuilderRows(builderPrerequisites, setBuilderPrerequisites, "prerequisites")}</section>
              <section className="side-card builder-section"><div className="panel-heading builder-steps-heading"><div><h2>Procedure steps</h2><p>Use Add after, Move up/down, or drag to rearrange any item.</p></div><span className="selection-count">{builderSteps.filter((step) => step.trim()).length} steps</span></div>{renderBuilderRows(builderSteps, setBuilderSteps, "steps")}</section>
              <section className="side-card builder-section"><div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>References & LMS</h3><p>Add navigation details and source links.</p></div></div>
                <a className="resource-link demo-lms-link" href={TDO_LMS_URL} target="_blank" rel="noreferrer"><span className="resource-mark">L</span><span><strong>Open TDO Learning Center</strong><small>LMS video-to-SOP integration is not connected yet.</small></span><ArrowUpRight size={15} /></a>
                <div className="builder-fields demo-reference-fields">
                  <div className="builder-field full"><label className="field-label" htmlFor="demo-navigation">Where to find it</label><input id="demo-navigation" className="text-input" value={builderNavigationPath} onChange={(event) => setBuilderNavigationPath(event.target.value)} placeholder="e.g. Setup > Program Setup > Calendar" /></div>
                  <div className="builder-field"><label className="field-label" htmlFor="demo-reference-title">Reference title</label><input id="demo-reference-title" className="text-input" value={builderReferenceTitle} onChange={(event) => setBuilderReferenceTitle(event.target.value)} /></div>
                  <div className="builder-field"><label className="field-label" htmlFor="demo-reference-url">Reference URL</label><input id="demo-reference-url" className="text-input" type="url" value={builderReferenceUrl} onChange={(event) => setBuilderReferenceUrl(event.target.value)} placeholder="https://..." /></div>
                </div>
              </section>
              <div className="builder-actions"><p><ShieldCheck size={16} /> Saved only for this demo session.</p><button className="button-primary" type="submit"><Check size={16} /> {builderOriginal ? "Save demo changes" : "Add SOP to demo"}</button></div>
            </form>
          </section>
        ) : activeView === "knowledge" ? (
          <section className="knowledge-page"><div className="page-intro"><div className="eyebrow"><span className="category-dot" /> TDO REFERENCES</div><h1>TDO12 resources</h1><p>Open the official knowledge base to browse current TDO articles. This demo does not import or reproduce their content.</p></div>
            <div className="knowledge-layout"><section className="knowledge-main-card"><div className="kb-art"><BookOpen size={26} /></div><span className="kb-overline">OFFICIAL TDO RESOURCE</span><h2>TDO Knowledge Base</h2><p>Search and read articles directly from the official TDO knowledge base, then add useful links as references in your editable SOPs.</p><a className="button-primary link-button" href={TDO_KB_URL} target="_blank" rel="noreferrer">Browse all TDO articles <ArrowUpRight size={16} /></a><div className="kb-disclaimer">Article availability and content are maintained by TDO.</div></section><section className="side-card"><div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>Learning Center</h3><p>Training videos and courses</p></div></div><p className="reference-copy">Use the LMS to find training. Generating SOPs automatically from videos requires a future integration; in the meantime, create or upload an SOP and enter the steps manually.</p><a className="resource-link" href={TDO_LMS_URL} target="_blank" rel="noreferrer"><span className="resource-mark">L</span><span><strong>TDO Learning Center</strong><small>Open the LMS dashboard</small></span><ArrowUpRight size={15} /></a></section></div>
          </section>
        ) : (
          <section className="library-page">
            <section className="demo-hero"><span className="welcome-badge"><CheckCircle2 size={13} /> FULL WORKSPACE DEMO</span><h1>Explore the SOP workspace<br /><span>before you sign in.</span></h1><p>Browse templates, edit and reorder steps, import existing SOPs, build your own workflow, and open TDO resources. Changes are temporary.</p></section>
            <div className="library-heading"><div><span className="eyebrow"><span className="category-dot" /> THE PLAYBOOK</span><h2>Explore SOP templates <span className="template-total">{filteredSops.length}</span></h2></div><div className="search-wrap"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search procedures..." aria-label="Search demo procedures" /></div></div>
            <div className="filter-row"><div className="filter-tabs" role="tablist" aria-label="Filter demo templates">{categories.map((category) => <button key={category} role="tab" aria-selected={activeCategory === category} className={`filter-tab ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><button className="sort-button" onClick={() => { setActiveCategory("All procedures"); setQuery(""); }}><ListChecks size={15} /> All templates</button></div>
            {filteredSops.length ? <div className="sop-grid">{filteredSops.map((sop, index) => {
              const Icon = [ClipboardCheck, HeartPulse, ShieldCheck, Activity, FileText, FolderOpen][index % 6];
              return <button className="sop-card" key={sop.id} onClick={() => openSop(sop)}><div className={`card-icon card-icon-${index % 4}`}><Icon size={19} /></div><div className="card-category">{sop.department || sop.category}<span className="category-dot small" /></div><h3>{sop.title}</h3><p>{sop.description}</p><div className="card-bottom"><span>{sop.steps.length} steps</span><span className="card-open">Customize <ArrowUpRight size={14} /></span></div></button>;
            })}</div> : <div className="empty-state"><Search size={22} /><h3>No matching procedures</h3><p>Try a different search or category.</p></div>}
            <p className="demo-disclaimer">Templates are editable starting points, not official TDO guidance. Demo edits are temporary and do not persist after leaving the workspace.</p>
          </section>
        )}
        {notice && <div className="toast" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
      </main>
      {selectedSop && <div className="demo-print"><header className="demo-print-header"><img src="/images/tdo-logo.png" alt="TDO Software" /><span>STANDARD OPERATING PROCEDURE · DEMO</span></header><h1>{selectedSop.title}</h1><p>{selectedSop.description}</p>{(selectedSop.prerequisites || []).some((_, index) => selectedPrerequisites.includes(index)) && <><h2>PREREQUISITES · ONE-TIME SETUP</h2><ol>{selectedSop.prerequisites?.map((step, index) => selectedPrerequisites.includes(index) && <li key={`print-pre-${index}`}>{step}</li>)}</ol></>}<h2>PROCEDURE</h2><ol>{selectedSop.steps.map((step, index) => selectedSteps.includes(index) && <li key={`print-${index}`}>{step}</li>)}</ol>{selectedSop.navigationPath && <p>{selectedSop.navigationPath.join(" > ")}</p>}{selectedSop.reference && <p>REFERENCE: {selectedSop.reference.title} · {selectedSop.reference.url}</p>}<footer>Endo SOP Studio · Demo template · Verify local policy before implementation</footer></div>}
    </div>
  );
}

export default DemoWorkspace;
