import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, Search, History, ArrowLeft, ChevronUp } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";

// Memoized HighlightedText component
const HighlightedText = memo(({ text, searchTerm }) => {
  if (!searchTerm?.trim()) return <span>{text}</span>;
  try {
    const pattern = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(pattern);
    return (
      <span>
        {parts.map((part, i) =>
          pattern.test(part) ? (
            <mark key={i} className="bg-yellow-300 text-stone-900 rounded-sm px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  } catch {
    return <span>{text}</span>;
  }
});
HighlightedText.displayName = 'HighlightedText';

// Memoized Section component
const Section = memo(({ title, children, searchTerm }) => (
  <section className="mb-6 sm:mb-8 scroll-mt-28">
    <h2 className="text-lg sm:text-2xl font-serif font-bold text-stone-800 mb-3 sm:mb-4 border-b border-stone-200 pb-2">
      <HighlightedText text={title} searchTerm={searchTerm} />
    </h2>
    <div className="text-sm sm:text-base text-stone-700 leading-relaxed space-y-3 sm:space-y-4">{children}</div>
  </section>
));
Section.displayName = 'Section';

// Memoized ListItem component
const ListItem = memo(({ children }) => (
  <li className="ml-3 sm:ml-4 pl-1.5 sm:pl-2 list-decimal marker:text-stone-500 marker:font-medium">
    <div className="pl-0.5 sm:pl-1">{children}</div>
  </li>
));
ListItem.displayName = 'ListItem';

// Memoized SubListItem component
const SubListItem = memo(({ children }) => (
  <li className="ml-3 sm:ml-4 pl-1.5 sm:pl-2 list-disc marker:text-stone-400">
    <div className="pl-0.5 sm:pl-1">{children}</div>
  </li>
));
SubListItem.displayName = 'SubListItem';

// Memoized RecentSearches component
const RecentSearches = memo(({ searches, onSelect }) => {
  if (!searches.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
      <span className="text-stone-500 flex items-center gap-1">
        <History className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Recent:
      </span>
      {searches.map((term, i) => (
        <button
          key={`${term}-${i}`}
          onClick={() => onSelect(term)}
          className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full transition-colors text-xs sm:text-sm"
        >
          {term}
        </button>
      ))}
    </div>
  );
});
RecentSearches.displayName = 'RecentSearches';

function Bylaws() {
  const [searchTerm, setSearchTerm] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bylaws_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // Track scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const next = [term, ...prev.filter(s => s !== term)].slice(0, 6);
      try {
        localStorage.setItem('bylaws_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearSearch = useCallback(() => setSearchTerm(""), []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleInputChange = useCallback((e) => {
    handleSearch(e.target.value);
  }, [handleSearch]);

  return (
    <div className="min-h-screen bg-stone-200 py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
        <Breadcrumbs items={[{ label: 'Bylaws' }]} />

        <div className="flex justify-start">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50 active:bg-stone-100">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to Admin
          </Link>
        </div>

        <div className="text-center space-y-2 sm:space-y-4">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif text-stone-900">Union Springs Association By-Laws</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-sm sm:text-lg px-2">
            Official rules and regulations governing the Union Springs Cemetery Association.
          </p>
        </div>

        <div className="bg-white p-3 sm:p-6 rounded-sm shadow-md space-y-3 sm:space-y-4 sticky top-[72px] sm:top-20 z-10 border border-stone-200">
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              type="text"
              placeholder="Search bylaws..."
              value={searchTerm}
              onChange={handleInputChange}
              className="pl-8 sm:pl-10 pr-8 sm:pr-10 h-10 sm:h-12 text-sm sm:text-lg border-stone-300 focus:border-teal-500 focus:ring-teal-500 bg-stone-50"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
          <RecentSearches searches={recentSearches} onSelect={handleSearch} />
        </div>

        <Card className="bg-white shadow-lg border-none">
          <CardContent className="p-4 sm:p-8 md:p-12">
            <Section title="ARTICLE I: Name" searchTerm={searchTerm}>
              <p>
                <HighlightedText text={'The cemetery located at 1311 Fire Tower Road, Shongaloo, Webster Parish, Louisiana, 71072 shall be known as the Union Springs Cemetery Association (hereinafter referred to as "the Association").'} searchTerm={searchTerm} />
              </p>
            </Section>

            <Section title="PREAMBLE" searchTerm={searchTerm}>
              <p>
                <HighlightedText text={'The Association is established to provide a respectful, dignified, and well-maintained final resting place for loved ones within the community. The Association shall administer and maintain the cemetery with the highest standards of care and responsibility.'} searchTerm={searchTerm} />
              </p>
            </Section>

            <Section title="ARTICLE II: Purpose" searchTerm={searchTerm}>
              <p><HighlightedText text={'The purpose of the Association shall be to:'} searchTerm={searchTerm} /></p>
              <ol className="space-y-1.5 sm:space-y-2 mt-2">
                <ListItem><HighlightedText text={'Provide proper care, maintenance, and preservation of grave sites and cemetery grounds.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Maintain and improve cemetery infrastructure, including grounds, fences, and grave markers.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Raise and manage financial resources for the ongoing upkeep of the cemetery.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Foster a fraternal and cooperative spirit among members of the Association.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE III: Perpetual Funds" searchTerm={searchTerm}>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'Any funds received and designated for perpetual care shall be preserved in an insured financial institution domiciled in Webster Parish, Louisiana. These funds shall be considered Perpetual Care Fund assets with the primary purpose of generating interest.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Interest earned from these accounts shall be deposited into the Association\'s general fund and expended as directed by the Executive Board in accordance with the Association\'s objectives.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE IV: Standards of Conduct" searchTerm={searchTerm}>
              <p><HighlightedText text={'All individuals involved in the Association shall adhere to the following:'} searchTerm={searchTerm} /></p>
              <ol className="space-y-1.5 sm:space-y-2 mt-2">
                <ListItem><HighlightedText text={'Democratic governance, including fair elections and member participation rights.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Prohibition of conflicts of interest among officers and agents in relation to financial transactions or business operations.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Maintenance of fiscal responsibility and transparency in all financial affairs.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE V: Membership" searchTerm={searchTerm}>
              <p><HighlightedText text={'Membership is open to individuals who:'} searchTerm={searchTerm} /></p>
              <ol className="space-y-1.5 sm:space-y-2 mt-2 mb-3 sm:mb-4">
                <ListItem><HighlightedText text={'Are 18 years of age or older and have a familial relationship (by blood or marriage) to a person interred within the Union Springs Cemetery.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Are 18 years of age or older, reside in the community, and have actively contributed to the cemetery\'s preservation and upkeep.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Submit a formal membership certification request to the Secretary, including documentation of their eligibility.'} searchTerm={searchTerm} /></ListItem>
              </ol>
              <p className="font-semibold mt-3 sm:mt-4 mb-2"><HighlightedText text={'Membership provisions:'} searchTerm={searchTerm} /></p>
              <ul className="space-y-1.5 sm:space-y-2">
                <SubListItem><HighlightedText text={'Each member is entitled to one certificate of membership and one vote.'} searchTerm={searchTerm} /></SubListItem>
                <SubListItem><HighlightedText text={'Membership does not guarantee burial rights within the cemetery.'} searchTerm={searchTerm} /></SubListItem>
                <SubListItem><HighlightedText text={'Membership is non-transferable and expires upon the member\'s death or voluntary termination.'} searchTerm={searchTerm} /></SubListItem>
              </ul>
            </Section>

            <Section title="ARTICLE VI: Meetings" searchTerm={searchTerm}>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'The Annual Meeting shall take place on the second Saturday in May at the Union Springs Cemetery.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Additional meetings may be scheduled by the Association as necessary.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Special meetings may be convened at the discretion of the President or at the request of 25% of members in good standing.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'A quorum shall consist of attending members in good standing, provided a reasonable effort was made to notify the membership of the meeting.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE VII: Elections" searchTerm={searchTerm}>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'Only members in good standing who are 18 years of age or older at the time of nomination and election shall be eligible to hold office.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Nominations for officers shall be made at the Annual Meeting, and any eligible member may nominate candidates.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'A maximum of two individuals from the same immediate family may serve in elected positions.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Elections shall be conducted via secret ballot among eligible voting members.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'The Executive Board shall fill vacant positions, if necessary, except within 60 days of the next Annual Meeting.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE VIII: Officers" searchTerm={searchTerm}>
              <p className="mb-2"><HighlightedText text={'The Association shall have the following officers:'} searchTerm={searchTerm} /></p>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'President – Presides over meetings, appoints committees, calls special meetings, and oversees Association operations.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Vice President – Assumes the duties of the President in their absence and manages delegated responsibilities.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Secretary – Maintains records of meetings, membership details, official communications, and reports.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Treasurer – Manages financial accounts, prepares reports, oversees expenditure, and ensures fiscal compliance.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE IX: Board of Directors" searchTerm={searchTerm}>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'The Executive Board shall consist of the elected officers and three Members At Large.'} searchTerm={searchTerm} /></ListItem>
                <ListItem>
                  <HighlightedText text={'The Executive Board shall have the authority to:'} searchTerm={searchTerm} />
                  <ul className="mt-2 space-y-1">
                    <SubListItem><HighlightedText text={'Appoint a Caretaker for cemetery maintenance.'} searchTerm={searchTerm} /></SubListItem>
                    <SubListItem><HighlightedText text={'Manage and hold all Association property in trust.'} searchTerm={searchTerm} /></SubListItem>
                    <SubListItem><HighlightedText text={'Represent the Association in legal and financial matters.'} searchTerm={searchTerm} /></SubListItem>
                    <SubListItem><HighlightedText text={'Conduct annual audits and present findings at the Annual Meeting.'} searchTerm={searchTerm} /></SubListItem>
                  </ul>
                </ListItem>
                <ListItem><HighlightedText text={'The Executive Board shall convene annually in April before the Annual Meeting to address business matters.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE X: Impeachment & Removal" searchTerm={searchTerm}>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'The Executive Board may suspend an officer or board member for misconduct or negligence following a fair hearing.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Upon formal impeachment, the individual shall have the right to a hearing before a three-member Review Committee appointed by the Board.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'All officers removed from the office must surrender all records, funds, and Association property to their successors.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE XI: Conduct of Meetings" searchTerm={searchTerm}>
              <p className="mb-2"><HighlightedText text={'Meetings shall follow standard parliamentary procedure and adhere to the following agenda:'} searchTerm={searchTerm} /></p>
              <ol className="space-y-1">
                <ListItem><HighlightedText text={'Call to Order'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Invocation'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Approval of Previous Meeting Minutes'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Financial Reports'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Committee Reports'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Old Business'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'New Business'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Benediction'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Adjournment'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE XII: Amendments" searchTerm={searchTerm}>
              <p><HighlightedText text={'Changes to these By-Laws require a two-thirds majority vote of the members at the Annual Meeting on the Second Saturday of May.'} searchTerm={searchTerm} /></p>
            </Section>

            <Section title="ARTICLE XIII: Burial Plots" searchTerm={searchTerm}>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'Plot reservations shall be managed by the President, Vice President, or Caretaker. Unauthorized markings are not valid.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'The size of all burial plots are five feet wide and ten feet in length. The Association shall strive to maintain a dignified and orderly manner when marking plots.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'The President, Vice-President, or Caretaker shall have sole authority for reserving or marking grave sites. Any sites marked by an individual other than the authorized persons will not be recognized.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'All grave sites will remain the property of the Union Springs Cemetery Association with no right of transfer to any person. A reserved plot cannot be transferred to another individual by the person who reserved it; if they no longer wish to keep the plot, they should notify a member of the Executive Board so the plot can be marked for use by another person.'} searchTerm={searchTerm} /></ListItem>
                <ListItem><HighlightedText text={'Maintenance Fees – A minimum donation of $400 secures a plot. Members must reaffirm intent to use the plot every five years; the Association will attempt to verify contact for one year. If no contact is successful the plot will revert to the Association.'} searchTerm={searchTerm} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE XIV: Urns" searchTerm={searchTerm}>
              <ol className="space-y-3 sm:space-y-4">
                <ListItem><HighlightedText text={'Urns may be interred with dignity and care, subject to:'} searchTerm={searchTerm} /></ListItem>
              </ol>
              <ul className="ml-4 sm:ml-8 mt-2 space-y-3 sm:space-y-4">
                <SubListItem>
                  <span className="font-semibold"><HighlightedText text={'Maximum of three urns per plot.'} searchTerm={searchTerm} /></span>
                  <ul className="mt-2 space-y-1.5 sm:space-y-2">
                    <li className="ml-4 sm:ml-6 list-[circle] text-sm sm:text-base"><HighlightedText text={'Place the first urn 12 inches from the headstone base or marker, centered on the plot. The second urn should be placed 12 inches from the first urn in the row. The third and final urn will be positioned 12 inches from the second urn in the row.'} searchTerm={searchTerm} /></li>
                    <li className="ml-4 sm:ml-6 list-[circle] text-sm sm:text-base"><HighlightedText text={'Dimensional limits: No more than 200 cubic inches, 9 inches tall, and 7 inches in diameter.'} searchTerm={searchTerm} /></li>
                  </ul>
                </SubListItem>
                <SubListItem><HighlightedText text={'Placement shall be regulated and mapped by the Association.'} searchTerm={searchTerm} /></SubListItem>
              </ul>
            </Section>
          </CardContent>
        </Card>

        {/* Back to Top Button */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-teal-700 hover:bg-teal-800 shadow-lg"
            size="icon"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(Bylaws);