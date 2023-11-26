"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

interface ServerSearchProps {
  data: {
    label: string;
    type: "channel" | "member";
    data:
      | {
          icon: React.ReactNode;
          name: string;
          id: string;
        }[]
      | undefined;
  }[];
}

export const ServerSearch = ({ data }: ServerSearchProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group px-2 py-2 rounded-md flex items-center gap-x-2 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition"
      >
        <SearchIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        <p className="font-semibold dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition">
          Search
        </p>
        <kbd className="pointer-event-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search all channels and members" />
        <CommandList>
          <CommandEmpty>No Result found</CommandEmpty>
        </CommandList>
        {data.map(({ label, type, data }) => {
          if (!data?.length) return null;
          return (
            <CommandGroup key={label} heading={label}>
              {data?.map(({ id, icon, name }) => {
                return (
                  <CommandItem key={id}>
                    {icon}
                    <span>{name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandDialog>
    </>
  );
};
