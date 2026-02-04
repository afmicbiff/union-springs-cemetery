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
    <div className="min-h-screen bg-stone-200 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Breadcrumbs items={[{ label: 'Bylaws' }]} />

        <div className="flex justify-start">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50">
            <ArrowLeft className="w-4 h-4" /> Back to Admin
          </Link>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Union Springs Association By-Laws</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">
            Official rules and regulations governing the Union Springs Cemetery Association.
          </p>
        </div>

        <div className="bg-white p-6 rounded-sm shadow-md space-y-4 sticky top-20 z-10 border border-stone-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search bylaws (e.g., 'burial', 'meeting', 'membership')..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 h-12 text-lg border-stone-300 focus:border-teal-500 focus:ring-teal-500 bg-stone-50"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-stone-500 flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> Recent:
              </span>
              {recentSearches.map((term, i) => (
                <button
                  key={`${term}-${i}`}
                  onClick={() => handleSearch(term)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1 rounded-full transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        <Card className="bg-white shadow-lg border-none">
          <CardContent className="p-8 md:p-12">
            <Section title="ARTICLE I: Name">
              <p>
                <HighlightedText text={'The cemetery located at 1311 Fire Tower Road, Shongaloo, Webster Parish, Louisiana, 71072 shall be known as the Union Springs Cemetery Association (hereinafter referred to as "the Association").'} />
              </p>
            </Section>

            <Section title="PREAMBLE">
              <p>
                <HighlightedText text={'The Association is established to provide a respectful, dignified, and well-maintained final resting place for loved ones within the community. The Association shall administer and maintain the cemetery with the highest standards of care and responsibility.'} />
              </p>
            </Section>

            <Section title="ARTICLE II: Purpose">
              <p><HighlightedText text={'The purpose of the Association shall be to:'} /></p>
              <ol className="space-y-2 mt-2">
                <ListItem><HighlightedText text={'Provide proper care, maintenance, and preservation of grave sites and cemetery grounds.'} /></ListItem>
                <ListItem><HighlightedText text={'Maintain and improve cemetery infrastructure, including grounds, fences, and grave markers.'} /></ListItem>
                <ListItem><HighlightedText text={'Raise and manage financial resources for the ongoing upkeep of the cemetery.'} /></ListItem>
                <ListItem><HighlightedText text={'Foster a fraternal and cooperative spirit among members of the Association.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE III: Perpetual Funds">
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'Any funds received and designated for perpetual care shall be preserved in an insured financial institution domiciled in Webster Parish, Louisiana. These funds shall be considered Perpetual Care Fund assets with the primary purpose of generating interest.'} /></ListItem>
                <ListItem><HighlightedText text={'Interest earned from these accounts shall be deposited into the Association\'s general fund and expended as directed by the Executive Board in accordance with the Association\'s objectives.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE IV: Standards of Conduct">
              <p><HighlightedText text={'All individuals involved in the Association shall adhere to the following:'} /></p>
              <ol className="space-y-2 mt-2">
                <ListItem><HighlightedText text={'Democratic governance, including fair elections and member participation rights.'} /></ListItem>
                <ListItem><HighlightedText text={'Prohibition of conflicts of interest among officers and agents in relation to financial transactions or business operations.'} /></ListItem>
                <ListItem><HighlightedText text={'Maintenance of fiscal responsibility and transparency in all financial affairs.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE V: Membership">
              <p><HighlightedText text={'Membership is open to individuals who:'} /></p>
              <ol className="space-y-2 mt-2 mb-4">
                <ListItem><HighlightedText text={'Are 18 years of age or older and have a familial relationship (by blood or marriage) to a person interred within the Union Springs Cemetery.'} /></ListItem>
                <ListItem><HighlightedText text={'Are 18 years of age or older, reside in the community, and have actively contributed to the cemetery\'s preservation and upkeep.'} /></ListItem>
                <ListItem><HighlightedText text={'Submit a formal membership certification request to the Secretary, including documentation of their eligibility.'} /></ListItem>
              </ol>
              <p className="font-semibold mt-4 mb-2"><HighlightedText text={'Membership provisions:'} /></p>
              <ul className="space-y-2">
                <SubListItem><HighlightedText text={'Each member is entitled to one certificate of membership and one vote.'} /></SubListItem>
                <SubListItem><HighlightedText text={'Membership does not guarantee burial rights within the cemetery.'} /></SubListItem>
                <SubListItem><HighlightedText text={'Membership is non-transferable and expires upon the member\'s death or voluntary termination.'} /></SubListItem>
              </ul>
            </Section>

            <Section title="ARTICLE VI: Meetings">
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'The Annual Meeting shall take place on the second Saturday in May at the Union Springs Cemetery.'} /></ListItem>
                <ListItem><HighlightedText text={'Additional meetings may be scheduled by the Association as necessary.'} /></ListItem>
                <ListItem><HighlightedText text={'Special meetings may be convened at the discretion of the President or at the request of 25% of members in good standing.'} /></ListItem>
                <ListItem><HighlightedText text={'A quorum shall consist of attending members in good standing, provided a reasonable effort was made to notify the membership of the meeting.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE VII: Elections">
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'Only members in good standing who are 18 years of age or older at the time of nomination and election shall be eligible to hold office.'} /></ListItem>
                <ListItem><HighlightedText text={'Nominations for officers shall be made at the Annual Meeting, and any eligible member may nominate candidates.'} /></ListItem>
                <ListItem><HighlightedText text={'A maximum of two individuals from the same immediate family may serve in elected positions.'} /></ListItem>
                <ListItem><HighlightedText text={'Elections shall be conducted via secret ballot among eligible voting members.'} /></ListItem>
                <ListItem><HighlightedText text={'The Executive Board shall fill vacant positions, if necessary, except within 60 days of the next Annual Meeting.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE VIII: Officers">
              <p className="mb-2"><HighlightedText text={'The Association shall have the following officers:'} /></p>
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'President – Presides over meetings, appoints committees, calls special meetings, and oversees Association operations.'} /></ListItem>
                <ListItem><HighlightedText text={'Vice President – Assumes the duties of the President in their absence and manages delegated responsibilities.'} /></ListItem>
                <ListItem><HighlightedText text={'Secretary – Maintains records of meetings, membership details, official communications, and reports.'} /></ListItem>
                <ListItem><HighlightedText text={'Treasurer – Manages financial accounts, prepares reports, oversees expenditure, and ensures fiscal compliance.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE IX: Board of Directors">
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'The Executive Board shall consist of the elected officers and three Members At Large.'} /></ListItem>
                <ListItem>
                  <HighlightedText text={'The Executive Board shall have the authority to:'} />
                  <ul className="mt-2 space-y-1">
                    <SubListItem><HighlightedText text={'Appoint a Caretaker for cemetery maintenance.'} /></SubListItem>
                    <SubListItem><HighlightedText text={'Manage and hold all Association property in trust.'} /></SubListItem>
                    <SubListItem><HighlightedText text={'Represent the Association in legal and financial matters.'} /></SubListItem>
                    <SubListItem><HighlightedText text={'Conduct annual audits and present findings at the Annual Meeting.'} /></SubListItem>
                  </ul>
                </ListItem>
                <ListItem><HighlightedText text={'The Executive Board shall convene annually in April before the Annual Meeting to address business matters.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE X: Impeachment & Removal">
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'The Executive Board may suspend an officer or board member for misconduct or negligence following a fair hearing.'} /></ListItem>
                <ListItem><HighlightedText text={'Upon formal impeachment, the individual shall have the right to a hearing before a three-member Review Committee appointed by the Board.'} /></ListItem>
                <ListItem><HighlightedText text={'All officers removed from the office must surrender all records, funds, and Association property to their successors.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE XI: Conduct of Meetings">
              <p className="mb-2"><HighlightedText text={'Meetings shall follow standard parliamentary procedure and adhere to the following agenda:'} /></p>
              <ol className="space-y-1">
                <ListItem><HighlightedText text={'Call to Order'} /></ListItem>
                <ListItem><HighlightedText text={'Invocation'} /></ListItem>
                <ListItem><HighlightedText text={'Approval of Previous Meeting Minutes'} /></ListItem>
                <ListItem><HighlightedText text={'Financial Reports'} /></ListItem>
                <ListItem><HighlightedText text={'Committee Reports'} /></ListItem>
                <ListItem><HighlightedText text={'Old Business'} /></ListItem>
                <ListItem><HighlightedText text={'New Business'} /></ListItem>
                <ListItem><HighlightedText text={'Benediction'} /></ListItem>
                <ListItem><HighlightedText text={'Adjournment'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE XII: Amendments">
              <p><HighlightedText text={'Changes to these By-Laws require a two-thirds majority vote of the members at the Annual Meeting on the Second Saturday of May.'} /></p>
            </Section>

            <Section title="ARTICLE XIII: Burial Plots">
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'Plot reservations shall be managed by the President, Vice President, or Caretaker. Unauthorized markings are not valid.'} /></ListItem>
                <ListItem><HighlightedText text={'The size of all burial plots are five feet wide and ten feet in length. The Association shall strive to maintain a dignified and orderly manner when marking plots.'} /></ListItem>
                <ListItem><HighlightedText text={'The President, Vice-President, or Caretaker shall have sole authority for reserving or marking grave sites. Any sites marked by an individual other than the authorized persons will not be recognized.'} /></ListItem>
                <ListItem><HighlightedText text={'All grave sites will remain the property of the Union Springs Cemetery Association with no right of transfer to any person. A reserved plot cannot be transferred to another individual by the person who reserved it; if they no longer wish to keep the plot, they should notify a member of the Executive Board so the plot can be marked for use by another person.'} /></ListItem>
                <ListItem><HighlightedText text={'Maintenance Fees – A minimum donation of $400 secures a plot. Members must reaffirm intent to use the plot every five years; the Association will attempt to verify contact for one year. If no contact is successful the plot will revert to the Association.'} /></ListItem>
              </ol>
            </Section>

            <Section title="ARTICLE XIV: Urns">
              <ol className="space-y-4">
                <ListItem><HighlightedText text={'Urns may be interred with dignity and care, subject to:'} /></ListItem>
              </ol>
              <ul className="ml-8 mt-2 space-y-4">
                <SubListItem>
                  <span className="font-semibold"><HighlightedText text={'Maximum of three urns per plot.'} /></span>
                  <ul className="mt-2 space-y-2">
                    <li className="ml-6 list-[circle]"><HighlightedText text={'Place the first urn 12 inches from the headstone base or marker, centered on the plot. The second urn should be placed 12 inches from the first urn in the row. The third and final urn will be positioned 12 inches from the second urn in the row.'} /></li>
                    <li className="ml-6 list-[circle]"><HighlightedText text={'Dimensional limits: No more than 200 cubic inches, 9 inches tall, and 7 inches in diameter.'} /></li>
                  </ul>
                </SubListItem>
                <SubListItem><HighlightedText text={'Placement shall be regulated and mapped by the Association.'} /></SubListItem>
              </ul>
            </Section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}