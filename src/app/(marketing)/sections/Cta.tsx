import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/public/Reveal";
import { HouseKeys } from "@/components/public/illustrations/spots";
import { ScribbleRing } from "@/components/public/illustrations/marks";

export default function Cta() {
  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <Reveal>
          <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:gap-16 lg:text-left">
            <HouseKeys className="h-40 shrink-0 sm:h-48" />
            <div>
              <h2 className="text-title max-w-2xl text-ink">
                The next tenancy you start could be the first one with nothing
                to chase.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-ink-3">
                Set up your first property in minutes.{" "}
                <span className="relative inline-block px-1 font-medium text-ink">
                  Thirty days free
                  <ScribbleRing />
                </span>
                , every feature included.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/auth/signup">
                    Get started
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="rounded-full px-6 text-ink-2">
                  <Link href="/help">Questions? Read the FAQ</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
