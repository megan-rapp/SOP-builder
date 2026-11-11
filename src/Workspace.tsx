import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Flower2,
  FolderOpen,
  HeartPulse,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  ListChecks,
  Mail,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { categories, sopTemplates, type SopTemplate } from "./data";

const TDO_KB_URL = "https://kb.tdo4endo.com/";

type Practice = { id: string; name: string; logo_path: string | null };
type PracticeMember = { practice_id: string; user_id: string; email: string; role: "owner" | "admin" | "member" };
type Location = { id: string; practice_id: string; name: string; address: string; source_location_id: string | null };
type SopRow = { location_id: string; sop_id: string; data: SopTemplate };
type KnowledgeLink = { id: string; title: string; url: string };
type Invitation = { id: string; email: string; created_at: string; expires_at: string; accepted_at: string | null };

function Workspace({ user, client, onSignOut }: { user: User; client: SupabaseClient; onSignOut: () => Promise<void> }) {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All procedures");
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState<"library" | "knowledge" | "builder" | "settings">("library");
  const [selectedSop, setSelectedSop] = useState<SopTemplate | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [workspaceSops, setWorkspaceSops] = useState<SopTemplate[]>(sopTemplates);
  const [sopRows, setSopRows] = useState<SopRow[]>([]);
  const [memberships, setMemberships] = useState<PracticeMember[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practiceId, setPracticeId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocationId, setActiveLocationId] = useState("");
  const [practice, setPractice] = useState<Practice | null>(null);
  const [logo, setLogo] = useState("");
  const [knowledgeLinks, setKnowledgeLinks] = useState<KnowledgeLink[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileLocationName, setProfileLocationName] = useState("Main office");
  const [profileLocationAddress, setProfileLocationAddress] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationSource, setNewLocationSource] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderDepartment, setBuilderDepartment] = useState("");
  const [builderDescription, setBuilderDescription] = useState("");
  const [builderSteps, setBuilderSteps] = useState(["", ""]);
  const [builderLocation, setBuilderLocation] = useState("");
  const [builderScreenshot, setBuilderScreenshot] = useState("");
  const [builderScreenshotPath, setBuilderScreenshotPath] = useState("");
  const [builderReferenceTitle, setBuilderReferenceTitle] = useState("");
  const [builderReferenceUrl, setBuilderReferenceUrl] = useState("");
  const [builderSopId, setBuilderSopId] = useState("");
  const [builderOriginalSop, setBuilderOriginalSop] = useState<SopTemplate | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [notice, setNotice] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const currentLocation = locations.find((location) => location.id === activeLocationId) || null;
  const role = memberships.find((membership) => membership.practice_id === practiceId)?.role;
  const canManagePractice = role === "owner" || role === "admin";
  const canResetSop = Boolean(currentLocation?.source_location_id && selectedSop && sopRows.some(
    (row) => row.location_id === currentLocation.id && row.sop_id === selectedSop.id,
  ));
  const filteredSops = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return workspaceSops.filter((sop) => {
      const matchesCategory = activeCategory === "All procedures" || sop.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        `${sop.title} ${sop.description} ${sop.category} ${sop.department || ""} ${sop.steps.join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, workspaceSops]);

  async function reloadMemberships() {
    const { data: memberData, error: memberError } = await client
      .from("practice_members")
      .select("practice_id, user_id, email, role")
      .eq("user_id", user.id);
    if (memberError) throw memberError;
    const nextMemberships = (memberData || []) as PracticeMember[];
    setMemberships(nextMemberships);
    if (nextMemberships.length === 0) {
      setPractices([]);
      setPracticeId("");
      return;
    }

    const { data: practiceData, error: practiceError } = await client
      .from("practices")
      .select("id, name, logo_path")
      .in("id", nextMemberships.map((membership) => membership.practice_id));
    if (practiceError) throw practiceError;
    const nextPractices = (practiceData || []) as Practice[];
    setPractices(nextPractices);
    setPracticeId((current) => nextPractices.some((item) => item.id === current) ? current : nextPractices[0]?.id || "");
  }

  async function reloadLocationSops(): Promise<SopTemplate[]> {
    if (!practiceId || !currentLocation) {
      setSopRows([]);
      setWorkspaceSops(sopTemplates);
      return sopTemplates;
    }
    const lineage: Location[] = [];
    let cursor: Location | undefined = currentLocation;
    while (cursor && !lineage.some((item) => item.id === cursor?.id)) {
      lineage.unshift(cursor);
      cursor = cursor.source_location_id
        ? locations.find((location) => location.id === cursor?.source_location_id)
        : undefined;
    }
    const locationIds = lineage.map((location) => location.id);
    const { data, error } = await client
      .from("practice_sops")
      .select("location_id, sop_id, data")
      .eq("practice_id", practiceId)
      .in("location_id", locationIds);
    if (error) throw error;
    const rows = ((data || []) as SopRow[]).sort(
      (left, right) => locationIds.indexOf(left.location_id) - locationIds.indexOf(right.location_id),
    );
    const resolved = new Map(sopTemplates.map((sop) => [sop.id, sop]));
    for (const row of rows) {
      const storedSop = { ...row.data, id: row.sop_id };
      if (storedSop.screenshot?.storagePath) {
        const { data: signed, error: signedError } = await client.storage
          .from("practice-assets")
          .createSignedUrl(storedSop.screenshot.storagePath, 3600);
        if (signedError) throw signedError;
        storedSop.screenshot.src = signed.signedUrl;
      }
      resolved.set(row.sop_id, storedSop);
    }
    setSopRows(rows);
    const effectiveSops = [...resolved.values()];
    setWorkspaceSops(effectiveSops);
    return effectiveSops;
  }

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setWorkspaceLoading(true);
      setWorkspaceError("");
      try {
        const { error: inviteError } = await client.rpc("accept_pending_practice_invitations");
        if (inviteError) throw inviteError;
        const { data: memberData, error: memberError } = await client
          .from("practice_members")
          .select("practice_id, user_id, email, role")
          .eq("user_id", user.id);
        if (memberError) throw memberError;
        const nextMemberships = (memberData || []) as PracticeMember[];
        const { data: practiceData, error: practiceError } = nextMemberships.length
          ? await client.from("practices").select("id, name, logo_path").in("id", nextMemberships.map((membership) => membership.practice_id))
          : { data: [], error: null };
        if (practiceError) throw practiceError;
        if (cancelled) return;
        const nextPractices = (practiceData || []) as Practice[];
        setMemberships(nextMemberships);
        setPractices(nextPractices);
        setPracticeId((current) => nextPractices.some((item) => item.id === current) ? current : nextPractices[0]?.id || "");
      } catch (error) {
        if (!cancelled) setWorkspaceError(error instanceof Error ? error.message : "Could not load your practice workspace.");
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, [client, user.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadPractice() {
      if (!practiceId) {
        setPractice(null);
        setLocations([]);
        setActiveLocationId("");
        return;
      }
      setWorkspaceLoading(true);
      setWorkspaceError("");
      try {
        const nextPractice = practices.find((item) => item.id === practiceId);
        if (!nextPractice) return;
        const { data: locationData, error: locationError } = await client
          .from("locations")
          .select("id, practice_id, name, address, source_location_id")
          .eq("practice_id", practiceId)
          .order("created_at");
        if (locationError) throw locationError;
        const nextLocations = (locationData || []) as Location[];
        const { data: resourceData, error: resourceError } = await client
          .from("practice_resources")
          .select("id, title, url")
          .eq("practice_id", practiceId)
          .order("created_at");
        if (resourceError) throw resourceError;
        if (cancelled) return;
        setPractice(nextPractice);
        setLocations(nextLocations);
        setActiveLocationId((current) => nextLocations.some((item) => item.id === current) ? current : nextLocations[0]?.id || "");
        setKnowledgeLinks((resourceData || []) as KnowledgeLink[]);
        setProfileName(nextPractice.name);
        const { data: logoResult, error: logoError } = nextPractice.logo_path
          ? await client.storage.from("practice-assets").createSignedUrl(nextPractice.logo_path, 3600)
          : { data: null, error: null };
        if (logoError) throw logoError;
        if (!cancelled) setLogo(logoResult?.signedUrl || "");
        if (canManagePractice) {
          const { data: inviteData, error: invitesError } = await client
            .from("practice_invitations")
            .select("id, email, created_at, expires_at, accepted_at")
            .eq("practice_id", practiceId)
            .order("created_at", { ascending: false });
          if (invitesError) throw invitesError;
          if (!cancelled) setInvitations((inviteData || []) as Invitation[]);
        } else {
          setInvitations([]);
        }
      } catch (error) {
        if (!cancelled) setWorkspaceError(error instanceof Error ? error.message : "Could not load practice settings.");
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    }
    void loadPractice();
    return () => { cancelled = true; };
  }, [canManagePractice, client, practiceId, practices]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await reloadLocationSops();
      } catch (error) {
        if (!cancelled) setWorkspaceError(error instanceof Error ? error.message : "Could not load SOPs for this location.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [activeLocationId, client, currentLocation, locations, practiceId]);

  useEffect(() => {
    setProfileLocationName(currentLocation?.name || "");
    setProfileLocationAddress(currentLocation?.address || "");
    setNewLocationSource(currentLocation?.id || "");
  }, [activeLocationId, currentLocation]);

  function openSop(sop: SopTemplate) {
    setSelectedSop(sop);
    setSelectedSteps(sop.steps.map((_, index) => index));
    setNotice("");
  }

  function openBuilder() {
    setSelectedSop(null);
    setActiveView("builder");
    setBuilderSopId("");
    setBuilderOriginalSop(null);
    setBuilderTitle("");
    setBuilderDepartment("");
    setBuilderDescription("");
    setBuilderSteps(["", ""]);
    setBuilderLocation("");
    setBuilderScreenshot("");
    setBuilderScreenshotPath("");
    setBuilderReferenceTitle("");
    setBuilderReferenceUrl("");
    setNotice("");
  }

  function editSop(sop: SopTemplate) {
    setBuilderSopId(sop.id);
    setBuilderOriginalSop(sop);
    setBuilderTitle(sop.title);
    setBuilderDepartment(sop.department || "");
    setBuilderDescription(sop.description);
    setBuilderSteps([...sop.steps]);
    setBuilderLocation(sop.navigationPath?.join(" > ") || "");
    setBuilderScreenshot(sop.screenshot?.src || "");
    setBuilderScreenshotPath(sop.screenshot?.storagePath || "");
    setBuilderReferenceTitle(sop.reference?.title || "");
    setBuilderReferenceUrl(sop.reference?.url || "");
    setSelectedSop(null);
    setActiveView("builder");
    setNotice("");
  }

  function handleBuilderScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setNotice("Choose a PNG, JPG, or WebP screenshot.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setNotice("Please choose a screenshot smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBuilderScreenshot(reader.result);
        setBuilderScreenshotPath("");
      }
    };
    reader.onerror = () => setNotice("The selected screenshot could not be read.");
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function saveSop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!practice || !currentLocation) {
      setNotice("Choose a practice location before saving an SOP.");
      return;
    }
    const title = builderTitle.trim();
    const steps = builderSteps.map((step) => step.trim()).filter(Boolean);
    const location = builderLocation.split(">").map((part) => part.trim()).filter(Boolean);
    const referenceTitle = builderReferenceTitle.trim();
    const referenceUrl = builderReferenceUrl.trim();
    if (!title || steps.length === 0) {
      setNotice("Add a title and at least one procedure step.");
      return;
    }

    let reference: SopTemplate["reference"];
    if (referenceTitle || referenceUrl) {
      try {
        const parsed = new URL(referenceUrl);
        if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || !referenceTitle) {
          setNotice("Add both a reference title and a valid http:// or https:// link, or leave both blank.");
          return;
        }
      } catch {
        setNotice("Add a valid reference link, or leave both reference fields blank.");
        return;
      }
      reference = { title: referenceTitle, url: referenceUrl };
    }

    let screenshot: SopTemplate["screenshot"];
    if (builderScreenshot) {
      let storagePath = builderScreenshotPath;
      if (!storagePath) {
        try {
          const imageBlob = await fetch(builderScreenshot).then((response) => response.blob());
          const extension = imageBlob.type === "image/png" ? "png" : imageBlob.type === "image/webp" ? "webp" : "jpg";
          storagePath = `${practice.id}/sops/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await client.storage.from("practice-assets").upload(storagePath, imageBlob, {
            contentType: imageBlob.type,
            upsert: false,
          });
          if (uploadError) throw uploadError;
        } catch (error) {
          setNotice(error instanceof Error ? `Screenshot upload failed: ${error.message}` : "Screenshot upload failed.");
          return;
        }
      }
      const { data: signed, error: signedError } = await client.storage.from("practice-assets").createSignedUrl(storagePath, 3600);
      if (signedError) {
        setNotice(`Could not prepare the screenshot: ${signedError.message}`);
        return;
      }
      screenshot = {
        src: signed.signedUrl,
        storagePath,
        alt: `Screenshot for ${title}`,
        caption: builderOriginalSop?.screenshot?.caption || "Practice-provided procedure screenshot.",
      };
    }

    const sop: SopTemplate = {
      id: builderSopId || `custom-${crypto.randomUUID()}`,
      title,
      category: builderOriginalSop?.category || "Custom",
      department: builderDepartment.trim() || undefined,
      description: builderDescription.trim() || "Custom procedure created for your practice.",
      duration: `${steps.length} steps`,
      steps,
      isCustom: builderOriginalSop?.isCustom ?? true,
      navigationPath: location.length ? location : undefined,
      screenshot,
      reference,
    };
    const { error } = await client.from("practice_sops").upsert({
      practice_id: practice.id,
      location_id: currentLocation.id,
      sop_id: sop.id,
      data: sop,
      updated_by: user.id,
    }, { onConflict: "location_id,sop_id" });
    if (error) {
      setNotice(`Could not save this SOP: ${error.message}`);
      return;
    }
    setSopRows((rows) => {
      const remaining = rows.filter((row) => !(row.location_id === currentLocation.id && row.sop_id === sop.id));
      return [...remaining, { location_id: currentLocation.id, sop_id: sop.id, data: sop }];
    });
    setWorkspaceSops((sops) => [...sops.filter((item) => item.id !== sop.id), sop]);
    setActiveView("library");
    if (!builderOriginalSop) setActiveCategory("Custom");
    openSop(sop);
    setNotice("SOP saved for this practice location.");
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setNotice("Choose a PNG, JPG, or WebP image for your logo.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setNotice("Please choose an image smaller than 3 MB.");
      return;
    }
    event.target.value = "";
    if (!practice) {
      setNotice("Create or select a practice before uploading its logo.");
      return;
    }
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${practice.id}/logos/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from("practice-assets").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setNotice(`Logo upload failed: ${uploadError.message}`);
      return;
    }
    const { error: updateError } = await client.from("practices").update({ logo_path: path }).eq("id", practice.id);
    if (updateError) {
      setNotice(`Logo uploaded but could not be saved to the practice: ${updateError.message}`);
      return;
    }
    const { data: signed, error: signedError } = await client.storage.from("practice-assets").createSignedUrl(path, 3600);
    if (signedError) {
      setNotice(`Logo saved but could not be displayed: ${signedError.message}`);
      return;
    }
    setLogo(signed.signedUrl);
    setPractice({ ...practice, logo_path: path });
    setPractices((items) => items.map((item) => item.id === practice.id ? { ...item, logo_path: path } : item));
    setNotice("Practice logo saved for all locations and SOPs.");
  }

  async function removeLogo() {
    if (!practice) return;
    const { error } = await client.from("practices").update({ logo_path: null }).eq("id", practice.id);
    if (error) {
      setNotice(`Could not remove the practice logo: ${error.message}`);
      return;
    }
    setLogo("");
    setPractice({ ...practice, logo_path: null });
    setPractices((items) => items.map((item) => item.id === practice.id ? { ...item, logo_path: null } : item));
    setNotice("Practice logo removed.");
  }

  async function saveKnowledgeLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = linkTitle.trim();
    const url = linkUrl.trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        setNotice("Enter a web link beginning with http:// or https://.");
        return;
      }
    } catch {
      setNotice("Enter a valid article URL.");
      return;
    }
    if (!practice) return;
    const { data, error } = await client.from("practice_resources").insert({
      practice_id: practice.id,
      title,
      url,
    }).select("id, title, url").single();
    if (error) {
      setNotice(`Could not save this reference: ${error.message}`);
      return;
    }
    setKnowledgeLinks((links) => [...links, data as KnowledgeLink]);
    setLinkTitle("");
    setLinkUrl("");
    setNotice("Article link saved for everyone in this practice.");
  }

  async function removeKnowledgeLink(id: string) {
    const { error } = await client.from("practice_resources").delete().eq("id", id);
    if (error) {
      setNotice(`Could not remove this reference: ${error.message}`);
      return;
    }
    setKnowledgeLinks((links) => links.filter((link) => link.id !== id));
  }

  async function runSafely(operation: () => Promise<void>, fallback: string) {
    try {
      await operation();
    } catch (error) {
      setWorkspaceError(`${fallback}: ${error instanceof Error ? error.message : "Unexpected network error."}`);
    }
  }

  async function retryWorkspaceLoad() {
    setWorkspaceError("");
    setWorkspaceLoading(true);
    try {
      await reloadMemberships();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not load your practice workspace.");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function createPractice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaceError("");
    const { error } = await client.rpc("create_practice_with_owner", {
      p_name: profileName.trim(),
      p_location_name: profileLocationName.trim(),
      p_location_address: profileLocationAddress.trim(),
    });
    if (error) {
      setWorkspaceError(`Could not create the practice: ${error.message}`);
      return;
    }
    try {
      await reloadMemberships();
    } catch (loadError) {
      setWorkspaceError(loadError instanceof Error ? loadError.message : "Practice created, but the workspace could not be loaded.");
    }
  }

  async function savePracticeProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!practice || !currentLocation) return;
    setWorkspaceError("");
    const { error: practiceError } = await client.from("practices")
      .update({ name: profileName.trim() })
      .eq("id", practice.id);
    if (practiceError) {
      setWorkspaceError(`Could not save practice name: ${practiceError.message}`);
      return;
    }
    const { error: locationError } = await client.from("locations")
      .update({ name: profileLocationName.trim(), address: profileLocationAddress.trim() })
      .eq("id", currentLocation.id);
    if (locationError) {
      setWorkspaceError(`Practice name saved, but location details could not be saved: ${locationError.message}`);
      return;
    }
    setPractice({ ...practice, name: profileName.trim() });
    setPractices((items) => items.map((item) => item.id === practice.id ? { ...item, name: profileName.trim() } : item));
    setLocations((items) => items.map((item) => item.id === currentLocation.id
      ? { ...item, name: profileLocationName.trim(), address: profileLocationAddress.trim() }
      : item));
    setNotice("Practice profile saved. The name and logo will appear on every SOP.");
  }

  async function addLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!practice) return;
    const { data, error } = await client.from("locations").insert({
      practice_id: practice.id,
      name: newLocationName.trim(),
      address: newLocationAddress.trim(),
      source_location_id: newLocationSource || null,
    }).select("id, practice_id, name, address, source_location_id").single();
    if (error) {
      setNotice(`Could not add this location: ${error.message}`);
      return;
    }
    const location = data as Location;
    setLocations((items) => [...items, location]);
    setActiveLocationId(location.id);
    setNewLocationName("");
    setNewLocationAddress("");
    setNotice(location.source_location_id
      ? "Location added. It inherits SOPs from its source until you customize one."
      : "Location added.");
  }

  async function inviteStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!practice) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || email === user.email?.toLowerCase()) {
      setNotice("Enter another team member's email address.");
      return;
    }
    const { error: expiredInviteError } = await client.from("practice_invitations")
      .delete()
      .eq("practice_id", practice.id)
      .is("accepted_at", null)
      .lt("expires_at", new Date().toISOString());
    if (expiredInviteError) {
      setNotice(`Could not clear expired invitations: ${expiredInviteError.message}`);
      return;
    }
    const { data: invitation, error: inviteError } = await client.from("practice_invitations").insert({
      practice_id: practice.id,
      email,
      role: "member",
      invited_by: user.id,
    }).select("id").single();
    if (inviteError) {
      setNotice(`Could not invite this email: ${inviteError.message}`);
      return;
    }
    const { error: codeError } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (codeError) {
      const { error: rollbackError } = await client.from("practice_invitations").delete().eq("id", invitation.id);
      setNotice(rollbackError
        ? `The code could not be sent (${codeError.message}), and the pending invitation could not be removed (${rollbackError.message}).`
        : `Invitation canceled because the sign-in code could not be sent: ${codeError.message}`);
      return;
    }
    setInviteEmail("");
    const { data: inviteData, error: reloadError } = await client.from("practice_invitations")
      .select("id, email, created_at, expires_at, accepted_at")
      .eq("practice_id", practice.id)
      .order("created_at", { ascending: false });
    if (reloadError) {
      setNotice(`Invitation sent, but the list could not be refreshed: ${reloadError.message}`);
      return;
    }
    setInvitations((inviteData || []) as Invitation[]);
    setNotice(`Invitation created and a 6-digit sign-in code sent to ${email}.`);
  }

  async function cancelInvitation(invitationId: string) {
    const { error } = await client.from("practice_invitations").delete().eq("id", invitationId);
    if (error) {
      setNotice(`Could not cancel this invitation: ${error.message}`);
      return;
    }
    setInvitations((items) => items.filter((item) => item.id !== invitationId));
  }

  async function resetSopOverride() {
    if (!currentLocation || !selectedSop) return;
    const { error } = await client.from("practice_sops").delete()
      .eq("location_id", currentLocation.id)
      .eq("sop_id", selectedSop.id);
    if (error) {
      setNotice(`Could not reset this location's SOP: ${error.message}`);
      return;
    }
    try {
      const effectiveSops = await reloadLocationSops();
      const restored = effectiveSops.find((sop) => sop.id === selectedSop.id);
      if (restored) openSop(restored);
      setNotice("Location-specific changes removed.");
    } catch (loadError) {
      setNotice(loadError instanceof Error ? loadError.message : "Could not reload the inherited SOP.");
    }
  }

  function printSop() {
    if (!selectedSop || selectedSteps.length === 0) {
      setNotice("Select at least one step before generating your SOP.");
      return;
    }
    window.print();
  }

  const progress = selectedSop
    ? Math.round((selectedSteps.length / selectedSop.steps.length) * 100)
    : 0;

  if (workspaceLoading && memberships.length === 0) {
    return <main className="auth-loading"><span className="spin"><LoaderCircle size={23} /></span> Loading your practice workspace…</main>;
  }

  if (memberships.length === 0) {
    return (
      <main className="auth-shell">
        <section className="auth-card practice-create-card">
          <img className="auth-tdo-logo" src="/images/tdo-logo.png" alt="TDO Software" />
          <span className="auth-kicker">SET UP YOUR WORKSPACE</span>
          <h1>Create your practice</h1>
          <p>Signed in as <strong>{user.email}</strong>. Name your practice and first location to get started. Your team can join by invitation.</p>
          <form className="auth-form" onSubmit={(event) => void runSafely(() => createPractice(event), "Could not create the practice")}>
            <label className="field-label" htmlFor="create-practice-name">Practice name</label>
            <input id="create-practice-name" className="text-input" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="e.g. Oakwood Endodontics" maxLength={120} required />
            <label className="field-label" htmlFor="create-location-name">First location</label>
            <input id="create-location-name" className="text-input" value={profileLocationName} onChange={(event) => setProfileLocationName(event.target.value)} placeholder="e.g. Main office" maxLength={100} required />
            <label className="field-label" htmlFor="create-location-address">Location or address <span>OPTIONAL</span></label>
            <input id="create-location-address" className="text-input" value={profileLocationAddress} onChange={(event) => setProfileLocationAddress(event.target.value)} placeholder="City, state or office address" maxLength={240} />
            <button className="button-primary auth-submit" type="submit"><Check size={16} /> Create practice workspace</button>
          </form>
          {workspaceError && <p className="auth-error" role="alert">{workspaceError}</p>}
          <button className="auth-secondary" onClick={() => void runSafely(onSignOut, "Could not sign out")}><LogOut size={14} /> Sign out</button>
        </section>
      </main>
    );
  }

  if (workspaceError && !practice) {
    return <main className="auth-shell"><section className="auth-card"><img className="auth-tdo-logo" src="/images/tdo-logo.png" alt="TDO Software" /><h1>Could not load workspace</h1><p className="auth-error">{workspaceError}</p><button className="button-primary auth-submit" onClick={() => void retryWorkspaceLoad()}>Retry</button><button className="auth-secondary" onClick={() => void runSafely(onSignOut, "Could not sign out")}>Sign out</button></section></main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setSelectedSop(null)} aria-label="Endo SOP Studio home">
          <img className="tdo-brand-logo" src="/images/tdo-logo.png" alt="TDO Software" />
          <span className="brand-mark"><Flower2 size={19} strokeWidth={1.8} /></span>
          <span className="brand-name">endo<span>sop</span><small>STUDIO</small></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={`nav-item ${activeView === "library" && !selectedSop ? "active" : ""}`}
            onClick={() => { setSelectedSop(null); setActiveView("library"); }}
          >
            <LayoutDashboard size={18} /> SOP library
            <span className="nav-count">{workspaceSops.length}</span>
          </button>
          <button
            className={`nav-item ${activeView === "knowledge" ? "active" : ""}`}
            onClick={() => { setSelectedSop(null); setActiveView("knowledge"); }}
          >
            <BookOpen size={18} /> TDO12 resources
            <ArrowUpRight className="nav-external" size={15} />
          </button>
          <button
            className={`nav-item ${activeView === "builder" ? "active" : ""}`}
            onClick={openBuilder}
          >
            <FilePlus2 size={18} /> Build Your Own
          </button>
          <button
            className={`nav-item ${activeView === "settings" ? "active" : ""}`}
            onClick={() => { setSelectedSop(null); setActiveView("settings"); }}
          >
            <Settings size={18} /> Practice settings
          </button>
        </nav>
        <div className="sidebar-label category-label">CATEGORIES</div>
        <nav className="category-nav" aria-label="SOP categories">
          {categories.slice(1).map((category, index) => {
            const icons = [HeartPulse, Activity, ShieldCheck, FolderOpen];
            const Icon = icons[index % icons.length];
            return (
              <button
                key={category}
                className={`category-link ${activeCategory === category && activeView === "library" ? "active" : ""}`}
                onClick={() => {
                  setSelectedSop(null);
                  setActiveView("library");
                  setActiveCategory(category);
                }}
              >
                <Icon size={16} />{category}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <span className="help-icon"><Sparkles size={16} /></span>
          <strong>Made for your practice</strong>
          <p>Start with a template. Make every step your own.</p>
        </div>
        <div className="sidebar-footer">
          <div className="avatar">{(user.email || "ES").slice(0, 2).toUpperCase()}</div>
          <div><strong>{user.email}</strong><span>{role || "Practice member"}</span></div>
          <button className="signout-button" onClick={() => void runSafely(onSignOut, "Could not sign out")} aria-label="Sign out"><LogOut size={15} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{selectedSop ? "Edit SOP" : activeView === "knowledge" ? "TDO12 resources" : activeView === "builder" ? "Build Your Own" : activeView === "settings" ? "Practice settings" : "SOP library"}</strong></div>
          <div className="topbar-actions">
            <span className="saved-indicator"><span className="status-dot" /> Shared practice workspace</span>
            <label className="location-select-label">
              <span>{practice?.name || "Practice"}</span>
              <select aria-label="Active practice location" value={activeLocationId} onChange={(event) => { setActiveLocationId(event.target.value); setSelectedSop(null); }}>
                {locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}
              </select>
            </label>
            {practices.length > 1 && <select className="practice-select" aria-label="Active practice" value={practiceId} onChange={(event) => { setPracticeId(event.target.value); setSelectedSop(null); }}>
              {practices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>}
            <button className="logo-button" onClick={() => setActiveView("settings")}><Settings size={16} /> Practice</button>
            <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={(event) => void runSafely(() => handleLogoUpload(event), "Could not update the practice logo")} />
          </div>
        </header>
        {workspaceError && <div className="workspace-alert" role="alert"><ShieldCheck size={16} /><span>{workspaceError}</span><button aria-label="Dismiss error" onClick={() => setWorkspaceError("")}><X size={15} /></button></div>}

        {selectedSop ? (
          <section className="editor-page">
            <button className="back-link" onClick={() => setSelectedSop(null)}><ArrowLeft size={16} /> Back to SOP library</button>
            <div className="editor-heading">
              <div>
                <div className="eyebrow"><span className="category-dot" />{selectedSop.department || selectedSop.category} <span className="eyebrow-divider">·</span> {selectedSop.isCustom ? "CUSTOM SOP" : "SOP TEMPLATE"}</div>
                <h1>{selectedSop.title}</h1>
                <p>{selectedSop.description}</p>
              </div>
              <div className="editor-actions">
                {canResetSop && <button className="secondary-button" onClick={() => void runSafely(resetSopOverride, "Could not reset the inherited SOP")}><ArrowLeft size={15} /> Reset inherited</button>}
                <button className="secondary-button" onClick={() => editSop(selectedSop)}><FileText size={15} /> Edit SOP</button>
                <button className="button-primary" onClick={printSop}><ArrowDownToLine size={17} /> Generate PDF</button>
              </div>
            </div>
            <div className="editor-grid">
              <section className="steps-panel">
                <div className="panel-heading">
                  <div><h2>Choose your steps</h2><p>Select the steps your practice follows.</p></div>
                  <span className="selection-count">{selectedSteps.length} of {selectedSop.steps.length} selected</span>
                </div>
                <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                <div className="step-list">
                  {selectedSop.steps.map((step, index) => {
                    const checked = selectedSteps.includes(index);
                    return (
                      <label key={step} className={`step-row ${checked ? "checked" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedSteps((current) =>
                            checked ? current.filter((stepIndex) => stepIndex !== index) : [...current, index].sort((a, b) => a - b)
                          )}
                        />
                        <span className="custom-checkbox">{checked && <Check size={13} strokeWidth={3} />}</span>
                        <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="step-copy">{step}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="steps-footer">
                  <span><CheckCircle2 size={16} /> Your selections are included in the PDF.</span>
                  <button className="text-button" onClick={() => setSelectedSteps(selectedSop.steps.map((_, index) => index))}>Select all</button>
                </div>
              </section>
              <aside className="editor-side">
                  {(selectedSop.navigationPath || selectedSop.screenshot) && (
                  <section className="side-card navigation-card">
                  <div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>{selectedSop.navigationPath ? "Where to find it" : "Procedure screenshot"}</h3><p>{selectedSop.isCustom ? "Practice-provided details" : "TDO menu navigation"}</p></div></div>
                  {selectedSop.navigationPath && <nav className="navigation-path" aria-label="Procedure location">
                      {selectedSop.navigationPath.map((item, index) => (
                        <span className="navigation-segment" key={`${item}-${index}`}>
                          {index > 0 && <span className="path-chevron">›</span>}
                          <strong>{item}</strong>
                        </span>
                      ))}
                  </nav>}
                    {selectedSop.screenshot && (
                      <figure className="tdo-screenshot">
                        <img src={selectedSop.screenshot.src} alt={selectedSop.screenshot.alt} />
                        <figcaption>{selectedSop.screenshot.caption}</figcaption>
                      </figure>
                    )}
                  </section>
                )}
                <section className="side-card document-card">
                  <div className="side-card-title"><span className="side-icon"><FileText size={17} /></span><div><h3>Document details</h3><p>Personalize your SOP</p></div></div>
                  <div className="practice-identity">
                    {logo ? <img src={logo} alt={`${practice?.name || "Practice"} logo`} /> : <span className="logo-placeholder"><ImagePlus size={18} /></span>}
                    <div><strong>{practice?.name}</strong><span>{currentLocation?.name}{currentLocation?.address ? ` · ${currentLocation.address}` : ""}</span></div>
                  </div>
                  <div className="document-logo">
                    <div><strong>{logo ? "Practice branding is set" : "Add practice logo"}</strong><span>Applied to all SOP PDFs</span></div>
                    <button className="icon-button" aria-label="Manage practice branding" onClick={() => setActiveView("settings")}><Settings size={16} /></button>
                  </div>
                </section>
                {selectedSop.isCustom ? selectedSop.reference && (
                  <section className="side-card reference-card">
                    <div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>Reference</h3><p>Added to this custom SOP</p></div></div>
                    <a className="resource-link" href={selectedSop.reference.url} target="_blank" rel="noreferrer"><span className="resource-mark added">↗</span><span><strong>{selectedSop.reference.title}</strong><small>Custom SOP reference</small></span><ArrowUpRight size={15} /></a>
                  </section>
                ) : (
                  <section className="side-card reference-card">
                    <div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>Reference library</h3><p>Keep source material close</p></div></div>
                    <p className="reference-copy">Review TDO12 documentation and your office's approved protocols before adopting a template.</p>
                    <a className="resource-link" href={TDO_KB_URL} target="_blank" rel="noreferrer"><span className="resource-mark">T</span><span><strong>TDO Knowledge Base</strong><small>Browse TDO12 articles</small></span><ArrowUpRight size={15} /></a>
                    {knowledgeLinks.map((link) => (
                      <a className="resource-link added-link" key={link.id} href={link.url} target="_blank" rel="noreferrer"><span className="resource-mark added">↗</span><span><strong>{link.title}</strong><small>Practice resource</small></span><ArrowUpRight size={15} /></a>
                    ))}
                  </section>
                )}
                <div className="editor-note"><ShieldCheck size={16} /><p>{selectedSop.isCustom ? "Review and approve this practice-created procedure before sharing it with your team." : "Templates are starting points, not clinical or regulatory guidance. Review and approve each SOP for your practice."}</p></div>
              </aside>
            </div>
          </section>
        ) : activeView === "builder" ? (
          <section className="builder-page">
            <button className="back-link" onClick={() => setActiveView("library")}><ArrowLeft size={16} /> Back to SOP library</button>
            <div className="page-intro builder-intro">
              <div className="eyebrow"><span className="category-dot" /> YOUR WORKFLOW, YOUR WAY</div>
              <h1>{builderSopId ? "Edit SOP" : "Build your own SOP"}</h1>
              <p>{builderSopId ? "Changes are saved to this location and inherited by its child locations." : "Create a practice-specific checklist. It does not need to be TDO-related."}</p>
            </div>
            <form className="builder-form" onSubmit={(event) => void runSafely(() => saveSop(event), "Could not save this SOP")}>
              <section className="side-card builder-section">
                <div className="side-card-title"><span className="side-icon"><FileText size={17} /></span><div><h3>Procedure details</h3><p>{builderSopId ? "Changes apply to this location and are shared with locations inheriting from it." : `Saved to ${currentLocation?.name || "this location"} and inherited by its child locations.`}</p></div></div>
                <div className="builder-fields">
                  <div className="builder-field">
                    <label className="field-label" htmlFor="builder-title">SOP title <span>REQUIRED</span></label>
                    <input id="builder-title" className="text-input" placeholder="e.g. Weekly supply inventory" value={builderTitle} onChange={(event) => setBuilderTitle(event.target.value)} required />
                  </div>
                  <div className="builder-field">
                    <label className="field-label" htmlFor="builder-department">Team or department <span>OPTIONAL</span></label>
                    <input id="builder-department" className="text-input" placeholder="e.g. Office administration" value={builderDepartment} onChange={(event) => setBuilderDepartment(event.target.value)} />
                  </div>
                  <div className="builder-field full">
                    <label className="field-label" htmlFor="builder-description">Purpose <span>OPTIONAL</span></label>
                    <textarea id="builder-description" className="text-input builder-textarea" placeholder="What should this procedure help your team accomplish?" value={builderDescription} onChange={(event) => setBuilderDescription(event.target.value)} rows={2} />
                  </div>
                </div>
              </section>
              <section className="side-card builder-section">
                <div className="panel-heading builder-steps-heading">
                  <div><h2>Procedure steps</h2><p>Add one action per step. You can select or deselect steps before exporting.</p></div>
                  <span className="selection-count">{builderSteps.filter((step) => step.trim()).length} steps</span>
                </div>
                <div className="builder-step-list">
                  {builderSteps.map((step, index) => (
                    <div className="builder-step-row" key={index}>
                      <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                      <input className="text-input" aria-label={`Procedure step ${index + 1}`} placeholder={`Describe step ${index + 1}`} value={step} onChange={(event) => setBuilderSteps((current) => current.map((item, stepIndex) => stepIndex === index ? event.target.value : item))} />
                      <button className="icon-button remove-step" type="button" aria-label={`Remove step ${index + 1}`} onClick={() => setBuilderSteps((current) => current.length > 1 ? current.filter((_, stepIndex) => stepIndex !== index) : [""])}><X size={15} /></button>
                    </div>
                  ))}
                </div>
                <button className="add-step-button" type="button" onClick={() => setBuilderSteps((current) => [...current, ""])}><Plus size={15} /> Add a step</button>
              </section>
              <section className="side-card builder-section">
                <div className="side-card-title"><span className="side-icon lavender"><BookOpen size={17} /></span><div><h3>Optional reference & visuals</h3><p>Add these only if they help explain your procedure</p></div></div>
                <div className="builder-fields">
                  <div className="builder-field full">
                    <label className="field-label" htmlFor="builder-location">Where to find it <span>OPTIONAL</span></label>
                    <input id="builder-location" className="text-input" placeholder="e.g. Setup > Program Setup > Calendar" value={builderLocation} onChange={(event) => setBuilderLocation(event.target.value)} />
                  </div>
                  <div className="builder-field">
                    <label className="field-label" htmlFor="builder-reference-title">Reference title <span>OPTIONAL</span></label>
                    <input id="builder-reference-title" className="text-input" placeholder="e.g. Office policy" value={builderReferenceTitle} onChange={(event) => setBuilderReferenceTitle(event.target.value)} />
                  </div>
                  <div className="builder-field">
                    <label className="field-label" htmlFor="builder-reference-url">Reference link <span>OPTIONAL</span></label>
                    <input id="builder-reference-url" type="url" className="text-input" placeholder="https://..." value={builderReferenceUrl} onChange={(event) => setBuilderReferenceUrl(event.target.value)} />
                  </div>
                  <div className="builder-field full">
                    <label className="field-label" htmlFor="builder-screenshot">Screenshot <span>OPTIONAL · UP TO 1 MB</span></label>
                    <div className="builder-upload-row">
                      <input id="builder-screenshot" type="file" accept="image/*" className="visually-hidden" onChange={handleBuilderScreenshot} />
                      <label className="upload-button" htmlFor="builder-screenshot"><ImagePlus size={16} />{builderScreenshot ? "Change screenshot" : "Choose screenshot"}</label>
                      <span>{builderScreenshot ? "Screenshot ready to include" : "Add a screen or button reference to the SOP and PDF."}</span>
                      {builderScreenshot && <button className="text-button" type="button" onClick={() => setBuilderScreenshot("")}>Remove</button>}
                    </div>
                    {builderScreenshot && <img className="builder-preview" src={builderScreenshot} alt="Screenshot preview for custom SOP" />}
                  </div>
                </div>
              </section>
              <div className="builder-actions">
                <p><ShieldCheck size={16} /> Saved to the shared practice workspace. TDO references are optional.</p>
                <button className="button-primary" type="submit"><Check size={16} /> {builderSopId ? "Save SOP changes" : "Create SOP"}</button>
              </div>
            </form>
          </section>
        ) : activeView === "settings" ? (
          <section className="settings-page">
            <div className="page-intro">
              <div className="eyebrow"><span className="category-dot" /> SHARED PRACTICE PROFILE</div>
              <h1>Practice settings</h1>
              <p>Branding, locations, and staff access for {practice?.name}.</p>
            </div>
            {!canManagePractice && <div className="source-note"><ShieldCheck size={17} /> You can use and edit SOPs. Ask a practice admin to change branding, locations, or invitations.</div>}
            <div className="settings-grid">
              <section className="side-card settings-card">
                <div className="side-card-title"><span className="side-icon"><ImagePlus size={17} /></span><div><h3>Practice identity</h3><p>Applied to all SOPs and exported PDFs</p></div></div>
                <form className="settings-form" onSubmit={(event) => void runSafely(() => savePracticeProfile(event), "Could not save practice profile")}>
                  <label className="field-label" htmlFor="settings-practice-name">Practice name</label>
                  <input id="settings-practice-name" className="text-input" value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={120} required disabled={!canManagePractice} />
                  <label className="field-label" htmlFor="settings-location-name">Selected location</label>
                  <input id="settings-location-name" className="text-input" value={profileLocationName} onChange={(event) => setProfileLocationName(event.target.value)} maxLength={100} required disabled={!canManagePractice} />
                  <label className="field-label" htmlFor="settings-location-address">Location details <span>OPTIONAL</span></label>
                  <input id="settings-location-address" className="text-input" value={profileLocationAddress} onChange={(event) => setProfileLocationAddress(event.target.value)} placeholder="Address, city, or office identifier" maxLength={240} disabled={!canManagePractice} />
                  <div className="settings-logo-row">
                    {logo ? <img src={logo} alt={`${practice?.name || "Practice"} logo`} /> : <span className="logo-placeholder"><ImagePlus size={18} /></span>}
                    <div><strong>{logo ? "Practice logo" : "No logo uploaded"}</strong><span>PNG, JPG, or WebP · up to 3 MB</span></div>
                    {canManagePractice && <button className="upload-button" type="button" onClick={() => logoInput.current?.click()}><Upload size={15} />{logo ? "Change" : "Upload"}</button>}
                    {logo && canManagePractice && <button className="icon-button" type="button" aria-label="Remove practice logo" onClick={() => void runSafely(removeLogo, "Could not remove the practice logo")}><X size={15} /></button>}
                  </div>
                  {canManagePractice && <button className="button-primary settings-save" type="submit"><Check size={16} /> Save practice profile</button>}
                </form>
              </section>
              <section className="side-card settings-card">
                <div className="side-card-title"><span className="side-icon lavender"><FolderOpen size={17} /></span><div><h3>Practice locations</h3><p>Choose a location at the top of the workspace</p></div></div>
                <div className="location-list">
                  {locations.map((location) => (
                    <button className={`location-row ${location.id === activeLocationId ? "active" : ""}`} key={location.id} onClick={() => { setActiveLocationId(location.id); setSelectedSop(null); }}>
                      <span className="location-row-icon"><FolderOpen size={16} /></span>
                      <span><strong>{location.name}</strong><small>{location.address || (location.source_location_id ? `Inherits SOPs from ${locations.find((item) => item.id === location.source_location_id)?.name || "source location"}` : "Original SOP library")}</small></span>
                      {location.id === activeLocationId && <span className="active-location-label">ACTIVE</span>}
                    </button>
                  ))}
                </div>
                {canManagePractice && <form className="new-location-form" onSubmit={(event) => void runSafely(() => addLocation(event), "Could not add this location")}>
                  <h4><Plus size={15} /> Add a location</h4>
                  <label className="field-label" htmlFor="new-location-name">Location name</label>
                  <input id="new-location-name" className="text-input" placeholder="e.g. North office" value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} maxLength={100} required />
                  <label className="field-label" htmlFor="new-location-address">Location details <span>OPTIONAL</span></label>
                  <input id="new-location-address" className="text-input" placeholder="Address or city" value={newLocationAddress} onChange={(event) => setNewLocationAddress(event.target.value)} maxLength={240} />
                  <label className="field-label" htmlFor="new-location-source">Start from</label>
                  <select id="new-location-source" className="text-input" value={newLocationSource} onChange={(event) => setNewLocationSource(event.target.value)}>
                    <option value="">Standard templates only</option>
                    {locations.map((location) => <option value={location.id} key={location.id}>{location.name} (inherit SOPs)</option>)}
                  </select>
                  <p className="settings-help">Locations inherit current SOPs from their source. When someone edits an SOP here, that location keeps its own version; later source changes continue to flow through other SOPs.</p>
                  <button className="button-primary settings-save" type="submit"><Plus size={15} /> Add location</button>
                </form>}
              </section>
              <section className="side-card settings-card team-card">
                <div className="side-card-title"><span className="side-icon"><ShieldCheck size={17} /></span><div><h3>Team access</h3><p>Members sign in with a one-time email code</p></div></div>
                <div className="team-list">
                  {memberships.filter((member) => member.practice_id === practiceId).map((member) => (
                    <div className="team-row" key={member.user_id}><span className="avatar">{member.email.slice(0, 2).toUpperCase()}</span><span><strong>{member.email}</strong><small>{member.role}</small></span></div>
                  ))}
                </div>
                {canManagePractice && <>
                  <form className="invite-form" onSubmit={(event) => void runSafely(() => inviteStaff(event), "Could not invite this team member")}>
                    <label className="field-label" htmlFor="invite-email">Invite a team member</label>
                    <div className="invite-input-row"><input id="invite-email" className="text-input" type="email" placeholder="teammate@practice.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /><button className="button-primary" type="submit"><Mail size={15} /> Invite</button></div>
                    <p className="settings-help">We email them a 6-digit sign-in code. Once verified, they join this practice as a member.</p>
                  </form>
                  {invitations.length > 0 && <div className="invitation-list"><h4>Invitations</h4>{invitations.map((invite) => <div className="invitation-row" key={invite.id}><span>{invite.email}<small>{invite.accepted_at ? "Joined" : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}</small></span><strong className={invite.accepted_at ? "invite-accepted" : "invite-pending"}>{invite.accepted_at ? "Accepted" : "Pending"}</strong>                  {!invite.accepted_at && <button className="icon-button" aria-label={`Cancel invitation for ${invite.email}`} onClick={() => void runSafely(() => cancelInvitation(invite.id), "Could not cancel invitation")}><X size={15} /></button>}</div>)}</div>}
                </>}
              </section>
            </div>
          </section>
        ) : activeView === "knowledge" ? (
          <section className="knowledge-page">
            <div className="page-intro">
              <div className="eyebrow"><span className="category-dot" /> YOUR SOURCE LIBRARY</div>
              <h1>TDO12 resources</h1>
              <p>Connect your SOPs to the articles and references your team relies on.</p>
            </div>
            <div className="knowledge-layout">
              <section className="knowledge-main-card">
                <div className="kb-art"><BookOpen size={26} /></div>
                <span className="kb-overline">OFFICIAL TDO RESOURCE</span>
                <h2>TDO Knowledge Base</h2>
                <p>Open the official TDO knowledge base to browse available TDO12 articles. Add specific article links below to keep frequently used references handy in your SOP editor.</p>
                <a className="button-primary link-button" href={TDO_KB_URL} target="_blank" rel="noreferrer">Browse all TDO articles <ArrowUpRight size={16} /></a>
                <div className="kb-disclaimer">Article availability and content are maintained by TDO. This app does not import or reproduce their articles.</div>
              </section>
              <section className="side-card link-manager">
                <div className="side-card-title"><span className="side-icon lavender"><Plus size={17} /></span><div><h3>Save an article link</h3><p>Available alongside every SOP</p></div></div>
                <form onSubmit={(event) => void runSafely(() => saveKnowledgeLink(event), "Could not save this reference")}>
                  <label className="field-label" htmlFor="link-title">Article title</label>
                  <input id="link-title" className="text-input" placeholder="e.g. TDO12 scheduling guide" value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} required />
                  <label className="field-label" htmlFor="link-url">Article URL</label>
                  <input id="link-url" type="url" className="text-input" placeholder="https://kb.tdo4endo.com/..." value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} required />
                  <button className="button-primary add-link-button" type="submit"><Plus size={16} /> Save article link</button>
                </form>
                {knowledgeLinks.length > 0 && (
                  <div className="saved-links"><h4>Shared practice resources</h4>{knowledgeLinks.map((link) => <div className="saved-link" key={link.id}><a href={link.url} target="_blank" rel="noreferrer">{link.title}<ArrowUpRight size={13} /></a><button onClick={() => void runSafely(() => removeKnowledgeLink(link.id), "Could not remove this reference")} aria-label={`Remove ${link.title}`}><X size={15} /></button></div>)}</div>
                )}
              </section>
            </div>
            <div className="source-note"><ShieldCheck size={17} /> SOP templates are independently written, editable starting points. Always verify TDO-specific workflows in the official knowledge base.</div>
          </section>
        ) : (
          <section className="library-page">
            <div className="welcome-strip">
              <div className="welcome-content">
                <span className="welcome-badge"><Sparkles size={13} /> YOUR SOP WORKSPACE</span>
                <h1>Good work starts with<br /><span>a clear process.</span></h1>
                <p>Build consistent workflows for your team, one step at a time.</p>
                <div className="welcome-stats"><span><strong>{workspaceSops.length}</strong> SOPs for {currentLocation?.name || "this location"}</span><span className="stats-divider" /><span><strong>01</strong> simple PDF export</span></div>
              </div>
              <div className="welcome-visual" aria-hidden="true">
                <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                <div className="visual-glow" />
                <div className="mini-sheet">
                  <div className="mini-sheet-top"><span className="mini-brand"><Flower2 size={15} /></span><span>STANDARD PROCEDURE</span></div>
                  <div className="mini-title" /><div className="mini-subtitle" />
                  <div className="mini-check"><i /><span /><b /></div><div className="mini-check"><i /><span className="long" /><b /></div><div className="mini-check"><i /><span /><b /></div>
                  <div className="mini-tag">READY FOR YOUR TEAM</div>
                </div>
                <div className="float-check"><CheckCircle2 size={17} /></div>
                <div className="float-file"><FileText size={17} /></div>
              </div>
              <div className="welcome-bottom-line" />
            </div>
            <div className="library-heading">
              <div><span className="eyebrow"><span className="category-dot" /> THE PLAYBOOK</span><h2>Explore SOP templates <span className="template-total">{filteredSops.length}</span></h2></div>
              <div className="search-wrap"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search procedures..." aria-label="Search SOP templates" /><kbd>⌘ K</kbd></div>
            </div>
            <div className="filter-row">
              <div className="filter-tabs" role="tablist" aria-label="Filter by category">
                {categories.map((category) => <button key={category} role="tab" aria-selected={activeCategory === category} className={`filter-tab ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}>{category}</button>)}
              </div>
              <button className="sort-button" onClick={() => { setActiveCategory("All procedures"); setQuery(""); }}><ListChecks size={15} /> All templates</button>
            </div>
            {filteredSops.length > 0 ? <div className="sop-grid">
              {filteredSops.map((sop, index) => <SopCard key={sop.id} sop={sop} index={index} onClick={() => openSop(sop)} />)}
            </div> : <div className="empty-state"><Search size={22} /><h3>No matching procedures</h3><p>Try another search or choose a different category.</p><button className="text-button" onClick={() => { setQuery(""); setActiveCategory("All procedures"); }}>Clear filters</button></div>}
            <footer className="library-footer"><span>Thoughtful workflows. Better days.</span><span>Reference <a href={TDO_KB_URL} target="_blank" rel="noreferrer">TDO12 knowledge base <ArrowUpRight size={12} /></a></span></footer>
          </section>
        )}

        {notice && <div className="toast" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
      </main>

      {selectedSop && (
        <div className="print-document" aria-hidden="true">
          <header className="print-header">
            <div className="print-brand">{logo && <img src={logo} alt="" />}{practice && <div><strong>{practice.name}</strong><small>{currentLocation?.name}{currentLocation?.address ? ` · ${currentLocation.address}` : ""}</small></div>}</div>
            <span className="print-label">STANDARD OPERATING PROCEDURE</span>
          </header>
          <h1>{selectedSop.title}</h1>
          <p className="print-description">{selectedSop.description}</p>
          <div className="print-meta"><span>DEPARTMENT <b>{selectedSop.department || selectedSop.category}</b></span><span>VERSION <b>1.0</b></span><span>REVIEWED <b>________________</b></span></div>
          {(selectedSop.navigationPath || selectedSop.screenshot) && (
            <section className="print-navigation">
              <h2>{selectedSop.navigationPath ? "WHERE TO FIND THIS SETTING" : "PROCEDURE SCREENSHOT"}</h2>
              {selectedSop.navigationPath && <p>{selectedSop.navigationPath.join(" > ")}</p>}
              {selectedSop.screenshot && (
                <figure>
                  <img src={selectedSop.screenshot.src} alt={selectedSop.screenshot.alt} />
                  <figcaption>{selectedSop.screenshot.caption}</figcaption>
                </figure>
              )}
            </section>
          )}
          <h2>PROCEDURE</h2>
          <ol>{selectedSop.steps.map((step, index) => selectedSteps.includes(index) && <li key={step}>{step}</li>)}</ol>
          {selectedSop.isCustom ? selectedSop.reference && (
            <div className="print-reference"><strong>REFERENCE</strong><br /><a href={selectedSop.reference.url}>{selectedSop.reference.title}</a></div>
          ) : (
            <div className="print-reference"><strong>REFERENCE</strong><br />TDO Knowledge Base: {TDO_KB_URL}<br />Verify current TDO12 guidance and applicable office policies before use.</div>
          )}
          <div className="print-signature"><span>Approved by: __________________________</span><span>Date: __________________</span></div>
          <footer>Endo SOP Studio · Editable practice template · Confirm local policy before implementation</footer>
        </div>
      )}
    </div>
  );
}

function SopCard({ sop, index, onClick }: { sop: SopTemplate; index: number; onClick: () => void }) {
  const icons = [ClipboardCheck, HeartPulse, ShieldCheck, Activity, FileText, FolderOpen];
  const Icon = icons[index % icons.length];
  return (
    <button className="sop-card" onClick={onClick}>
      <div className={`card-icon card-icon-${index % 4}`}><Icon size={19} strokeWidth={1.8} /></div>
      <div className="card-category">{sop.department || sop.category}<span className="category-dot small" /></div>
      <h3>{sop.title}</h3>
      <p>{sop.description}</p>
      <div className="card-bottom"><span><ListChecks size={14} />{sop.steps.length} steps</span><span className="card-open">Customize <ArrowUpRight size={14} /></span></div>
    </button>
  );
}

export default Workspace;
