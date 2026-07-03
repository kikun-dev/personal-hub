"use client";

import type { Dispatch, SetStateAction } from "react";
import type { PersonOption } from "@/types/person";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  CREDIT_FIELDS,
  peopleNamesForRole,
  splitPeople,
  type CreditFieldKey,
} from "@/components/admin/song/songFormShared";

type SongCreditsSectionProps = {
  values: Record<CreditFieldKey, string>;
  creditQueries: Record<CreditFieldKey, string>;
  setCreditQueries: Dispatch<SetStateAction<Record<CreditFieldKey, string>>>;
  people: PersonOption[];
  errors: Record<string, string>;
  addCreditPerson: (field: CreditFieldKey, rawName: string) => void;
  removeCreditPerson: (field: CreditFieldKey, index: number) => void;
};

export function SongCreditsSection({
  values,
  creditQueries,
  setCreditQueries,
  people,
  errors,
  addCreditPerson,
  removeCreditPerson,
}: SongCreditsSectionProps) {
  return (
    <div className="space-y-3">
      {CREDIT_FIELDS.map(({ key, label, role }) => {
        const selectedPeople = splitPeople(values[key]);
        const query = creditQueries[key];
        const suggestions = peopleNamesForRole(people, role)
          .filter((personName) => personName.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 20);

        return (
          <div key={key} className="rounded-lg border border-foreground/10 p-3">
            <label className="block text-sm font-medium text-foreground/70">{label}</label>

            <div className="mt-2 flex flex-wrap gap-2">
              {selectedPeople.map((personName, index) => (
                <span
                  key={`${key}-${personName}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-xs text-foreground"
                >
                  {personName}
                  <button
                    type="button"
                    className="text-foreground/60 hover:text-foreground"
                    onClick={() => removeCreditPerson(key, index)}
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedPeople.length === 0 && (
                <span className="text-xs text-foreground/40">未設定</span>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                id={`${key}-search`}
                label={`${label}を検索/入力`}
                list={`${key}-person-suggestions`}
                value={query}
                onChange={(e) =>
                  setCreditQueries((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                error={errors[key]}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCreditPerson(key, query);
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => addCreditPerson(key, query)}
              >
                追加
              </Button>
            </div>

            <datalist id={`${key}-person-suggestions`}>
              {suggestions.map((personName) => (
                <option key={`${key}-${personName}`} value={personName} />
              ))}
            </datalist>
          </div>
        );
      })}
    </div>
  );
}
