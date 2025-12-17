import React from 'react';
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <Breadcrumbs items={[{ label: 'Services' }]} />
        
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Services</h1>
          <div className="w-24 h-1 bg-red-700 mx-auto"></div>
          <div className="text-stone-600 max-w-2xl mx-auto text-lg leading-relaxed text-left">
            <h3 className="text-2xl font-serif font-bold text-stone-800 mt-6 mb-4">The staff at the Union Springs Cemetery will:</h3>
            <ol className="list-decimal list-inside ml-4 space-y-2 text-left">
                <li>Provide proper care, maintenance, and preservation of grave sites and cemetery grounds.</li>
                <li>Maintain and improve cemetery infrastructure, including grounds, fences, and grave markers.</li>
                <li>Raise and manage financial resources for the ongoing upkeep of the cemetery.</li>
                <li>Foster a fraternal and cooperative spirit among members of the Association.</li>
            </ol>

            <h3 className="text-2xl font-serif font-bold text-stone-800 mt-10 mb-4">Perpetual Funds</h3>
            <ol className="list-decimal list-inside ml-4 space-y-4 text-left text-stone-600">
                <li>Any funds received and designated for perpetual care shall be preserved in an insured financial institution domiciled in Webster Parish, Louisiana. These funds shall be considered Perpetual Care Fund assets with the primary purpose of generating interest.</li>
                <li>Interest earned from these accounts shall be deposited into the Association’s general fund and expended as directed by the Executive Board in accordance with the Association’s objectives.</li>
            </ol>

            <h3 className="text-2xl font-serif font-bold text-stone-800 mt-10 mb-4">Burial Plots</h3>
            <ol className="list-decimal list-inside ml-4 space-y-4 text-left text-stone-600">
                <li>Plot reservations shall be managed by the President, Vice President, or Caretaker. Unauthorized markings are not valid.</li>
                <li>The size of all burial plots are five feet wide and ten feet in length. The Association shall strive to maintain a dignified and orderly manner when marking plots.</li>
                <li>The President, Vice-President, or Caretaker shall have sole authority for reserving or marking grave sites. Any sites marked by an individual other than the authorized persons will not be recognized.</li>
                <li>All grave sites will remain the property of the Union Springs Cemetery Association with no right of transfer to any person. A reserved plot cannot be transferred to another individual by the person who reserved it, if they no longer wish to keep the plot, they should notify a member of the Executive Board so the plot can be marked for use by another person.</li>
                <li>Maintenance Fees – <strong>A minimum donation of $400 secures a plot</strong>. Members must reaffirm intent to use the plot every five years, the Association will attempt to verify contact for one year. If no contact is successful the plot will revert to the Association.</li>
            </ol>

            <h3 className="text-2xl font-serif font-bold text-stone-800 mt-10 mb-4">Urns</h3>
            <p className="text-left text-stone-600 font-medium mb-4">Maximum of three urns per plot.</p>
            <ol className="list-decimal list-inside ml-4 space-y-4 text-left text-stone-600">
                <li>Place the first urn 12 inches from the headstone base or marker, centered on the plot. The second urn should be placed 12 inches from the first urn in the row. The third and final urn will be positioned 12 inches from the second urn in the row.</li>
                <li>Dimensional limits: No more than 200 cubic inches, 9 inches tall, and 7 inches in diameter.</li>
                <li>Placement shall be regulated and mapped by the Association.</li>
            </ol>
            <br />
            <h3 className="text-2xl font-serif font-bold text-stone-800 mt-10 mb-4">The cemetery allows for:</h3>
            <ul className="list-disc list-inside ml-4 space-y-2 font-medium">
                <li>Traditional Burial Plots</li>
                <li>Cremation Niches</li>
                <li>Family Estates</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-slate-50 p-8 rounded-sm shadow-md">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Traditional Burial</h3>
                <p className="text-stone-600 text-lg leading-relaxed">
                    The community Funeral Homes will assist you in the services of traditional burial.
                </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-sm shadow-md">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Cremation Services</h3>
                <p className="text-stone-600 text-lg leading-relaxed">
                    The community Funeral Homes will assist you in the services of cremation.
                </p>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-sm shadow-md md:col-span-2">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Memorial Planning</h3>
                <p className="text-stone-600 text-lg leading-relaxed">
                    The community Funeral Homes will assist you in the services of memorial planning.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
}