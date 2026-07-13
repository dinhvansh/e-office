"use client";

import { useState } from "react";
import { Plus, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CCEmailsSectionProps {
  emails: string[];
  onChange: (emails: string[]) => void;
}

export function CCEmailsSection({ emails, onChange }: CCEmailsSectionProps) {
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = () => {
    setError("");
    
    if (!newEmail.trim()) {
      setError("Vui lòng nhập email");
      return;
    }

    if (!validateEmail(newEmail)) {
      setError("Email không hợp lệ");
      return;
    }

    if (emails.includes(newEmail)) {
      setError("Email đã tồn tại");
      return;
    }

    onChange([...emails, newEmail]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    onChange(emails.filter((e) => e !== email));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-200">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Mail className="w-4 h-4 text-green-600" />
          📧 CC - Nhận bản sao
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Thêm email người nhận bản sao (không cần ký)
        </p>
      </div>

      {/* Email list */}
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <Badge
              key={email}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <Mail className="w-3 h-3" />
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add email input */}
      <div className="space-y-2">
        <Label htmlFor="cc-email" className="text-xs">
          Thêm email CC
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="cc-email"
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setError("");
            }}
            onKeyPress={handleKeyPress}
            className="h-9 min-w-0"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEmail}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>

      {emails.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Chưa có email CC. Nhập email và click &quot;Thêm&quot;.
        </div>
      )}
    </div>
  );
}
