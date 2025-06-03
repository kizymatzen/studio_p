
"use client";

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, Users, UsersRound, Baby } from "lucide-react"; // Added Baby icon

export function ProfileMenu() {
  // In a real app, user data would come from context or props
  const userInitial = "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Open profile menu">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src="https://placehold.co/40x40.png" alt="User avatar" data-ai-hint="person avatar" />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/add-child" className="flex items-center gap-2 cursor-pointer">
            <Baby className="h-4 w-4" />
            <span>Add Child</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my-children" className="flex items-center gap-2 cursor-pointer">
            <Users className="h-4 w-4" />
            <span>My Children</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/manage-users" className="flex items-center gap-2 cursor-pointer">
            <UsersRound className="h-4 w-4" />
            <span>Manage Users</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/logout" className="flex items-center gap-2 cursor-pointer">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
