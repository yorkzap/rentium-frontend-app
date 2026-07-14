import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import Reveal from "@/components/public/Reveal";
import { FAQS } from "./data";

export function FaqList() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQS.map((faq, i) => (
        <AccordionItem key={faq.question} value={`faq-${i}`} className="border-line">
          <AccordionTrigger className="text-left text-base font-medium text-ink hover:no-underline">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-6 text-ink-3">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-24">
      <Reveal>
        <div className="text-center">
          <p className="text-kicker">FAQ</p>
          <h2 className="text-title mt-3 text-ink">Fair questions.</h2>
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mt-10">
          <FaqList />
        </div>
      </Reveal>
    </section>
  );
}
