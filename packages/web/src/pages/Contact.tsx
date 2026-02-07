import { t } from "@/i18n";

export function Contact() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("contact.title")}
      </h2>
      <p className="mt-2 text-foreground">
        Email:{" "}
        <a href="mailto:support@loyalty.example.com" className="text-primary underline-offset-4 hover:underline">
          support@loyalty.example.com
        </a>
      </p>
      <p className="mt-1 text-foreground">
        Support number:{" "}
        <a href="tel:+911234567890" className="text-primary underline-offset-4 hover:underline">
          +91 1234567890
        </a>
      </p>
    </div>
  );
}
