import { forwardRef } from "react";

const SearchBar = forwardRef(function SearchBar({ value, onChange }, ref) {
  return (
    <div className="relative min-w-[260px] flex-1">
      <input
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-vault-line bg-vault-input px-3 py-2.5 text-sm text-vault-text outline-none transition focus:border-vault-accent"
        placeholder="Search memories"
      />
    </div>
  );
});

export default SearchBar;
