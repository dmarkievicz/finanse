import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AccountCreateForm } from "@/components/accounts/account-create-form";

export default function NewAccountPage() {
  return (
    <div>
      <PageHeader
        title="Nowe konto"
        description="Dodaj konto bankowe, gotówkę, lokatę lub inne — gotowe do rejestrowania transakcji"
      />

      <Link
        href="/accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do kont
      </Link>

      <AccountCreateForm />
    </div>
  );
}
