export default function SensitivityBanner({ sensitivity }) {
  if (sensitivity !== "high") return null;
  return (
    <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
      Sensitive content detected. This memory may contain private data. Saving requires confirmation.
    </div>
  );
}
