import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Search, X, History as HistoryIcon, Calendar, MapPin, Users, Droplets, Church, BookOpen } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

// Enhanced data structure with titles and eras for the timeline
const historySections = [
    {
        id: "intro",
        era: "Pioneer Days (1816-1830)",
        title: "Early Settlement",
        icon: MapPin,
        text: `As early as 1816, Jesse Sikes came to the Leton area in northwest Louisiana, and then settled on Dorcheat Bayou, where he built an Indian trading post and established a ferry. At this time, Webster Parish was still part of Natchitoches Parish. White settlers began arriving for the purpose of homesteading the area, now known as Union Springs. The ferry to cross the bayou was called Sikes' Ferry. NOTE 1`
    },
    {
        id: "storm",
        era: "Pioneer Days (1816-1830)",
        title: "The Great Storm",
        icon: Droplets,
        text: `About 1830, there was a storm in this area. Many of the old timers called it a "harricane", but from all indications, it must have been a tornado. It cleared a path in excess of one-half mile all the way from the present Union Springs area up into Columbia County, Arkansas. The area just to the west of New Shongaloo is still called "The Harricane". A woman was killed here when her log cabin fell in on her. In 1961, Aurie Duke Morgan said there were still signs of the storm in their woods.`
    },
    {
        id: "survey",
        era: "Pioneer Days (1816-1830)",
        title: "Surveying the Land",
        icon: MapPin,
        text: `When William Dearing surveyed the area for the government in 1835, he plotted the path of the storm and called it Hurricane. John T. Campbell, Minden lawyer, said this land was advertised back East as "already done cleared land" and everyone wanted to buy land in the Hurricane. This map, the Governmental Map of Webster Public Lands June 30, 1830, can be seen in the Clerk’s office in Minden, Louisiana.`
    },
    {
        id: "spiritual",
        era: "Pioneer Days (1816-1830)",
        title: "Spiritual Beginnings",
        icon: Church,
        text: `As more people inhabited the land, their need for spiritual guidance led to religious services being conducted in private homes, as well as meetings under the arbor structures. One favorite meeting site was the spot on which the Union Springs Church now stands. On the sides of the hill flowed numerous natural springs of water. Four springs were especially good. Their cool, clear waters flowed in all directions--northward, westward, southward, and eastward--before making their way into Dorcheat Bayou. Since there was a union of four springs on the hillside, and since Methodists, Baptists, Missionary Baptists, and Pentecostals were represented in the congregation, the name of the church was appropriately selected: Union Springs. Some say an encampment of Union soldiers here during reconstruction gave the area its name.`
    },
    {
        id: "school",
        era: "Building a Community (1850-1900)",
        title: "The First School",
        icon: BookOpen,
        text: `By 1850, the area had become a part of Claiborne Parish; and a private school was built at Union Springs. The log structure consisted of one room, which was heated by a large mud fireplace as the school term lasted two or three months during the winter. The students paid their tuitions with chickens, eggs, butter, potatoes, and other farm products. Each family was responsible for its children's transportation. NOTE 2`
    },
    {
        id: "church_services",
        era: "Building a Community (1850-1900)",
        title: "Church Constitution",
        icon: Church,
        text: `Church services were conducted only one Sunday a month, and the school building was used. No records of Union Springs Church have been found as to its constitution. One land record shows that on July 20, 1894, John F. Phillips Sr. sold two acres of land to the trustees of Union Springs School. These trustees-- James Richard Martin; his son, H. L. Martin; William Thomas Gleason; William W. Kaylor; W. D. Crouch; George W. Holiday; Jessie O. Wise: and Ally W. Sinclair--paid five dollars for the plot of land located in Section 13, Township 22, Range 10 West, for use as a nondenominational church. NOTE 3`
    },
    {
        id: "association",
        era: "Building a Community (1850-1900)",
        title: "Joining the Association",
        icon: Users,
        text: `In 1895, Union Springs Baptist Church wrote a petitionary letter to the North Louisiana Baptist Association. Upon its reading the church was received as a member of the Association and the messengers were given the handshake of fellowship. The association was held at the New Friendship Baptist Church on September 3, 1895, in Claiborne Parish, Louisiana. The pastor of Union Springs was J.E. Williamson, the clerk was J. F. Phillips Jr.; the church was valued at one hundred fifty dollars, which included the value of the organ. Other statistics included the church's donation of one dollar for associational purposes. The total membership thirteen worshipers: four men and nine women. One member was added by baptism, and one was lost by letter. At this time, there was a post office at Dorcheat Louisiana. NOTE 4`
    },
    {
        id: "early_period",
        era: "Building a Community (1850-1900)",
        title: "Early Traditions",
        icon: HistoryIcon,
        text: `According to the deceased parents of the present generation of members, the Union Springs Church was established in 1890. The church may have been organized that year; not applying for membership in the Baptist Association until the year 1895. Unfortunately, no records for this earlier period can be found; nor is any ancestor living to verify the facts. Records at the Baptist Association Building in Alexandria, Louisiana, indicate that the Union Springs Baptist Church was constituted in 1895. No correspondence was received from the Union Springs Church to the Association during the period dating from 1895 to 1933. During this time the building was used as a church, a school, and a community assembly place. Any denomination was granted the privilege of conducting services in the church building. Whenever these religious services were held everyone-regardless of his religious convictions--came to worship. It is reported that there were great evangelistic meetings in those early days, with great preaching, vigorous singing, feet washing, and speaking in other tongues. Often these meetings lasted until early in the morning hours. NOTE 5`
    },
    {
        id: "families",
        era: "Building a Community (1850-1900)",
        title: "Founding Families",
        icon: Users,
        text: `A tentative list of families who were probably active those early years of the Union Springs Church includes these: W. W. Kaylor; Richard Martin; W. T. Gleason; John F. Phillips Sr.; John F. Phillips Jr; A. W. Sinclair: George W. Holiday: Jesse O. Wise; John Perkins; Nelson Slack; Walter Jacob Teutsch; Henry Jame Nealy Sr: H. L. Martin: W. D. Crouch: Jess Cox: Eli Coyle; Richard Vowell; and a Mr. Wallace.`
    },
    {
        id: "coyle",
        era: "Building a Community (1850-1900)",
        title: "Tragedy on the Bayou",
        icon: Droplets,
        text: `E. M. "Eli" Coyle (1860-1928), who married Mary Sarepta Lennard, lived on the road to Cox's Ford north of Union Springs. A sad, but interesting, story is told about their daughter Eva Mae. She died on February 17, 1899; her body was to be buried in Old Sarepta Cemetery. A severe winter storm had frozen solid Dorcheat Bayou. The ferry was inoperative; therefore, John Slack, Minnie Dollar's husband and Nina Hardaway's father, assisted Claiborne Lindsey, Ida Sikes' brother, to push the coffin across the ice so the body could be buried as planned. NOTE 6 Her funeral was held on the day that she was to be married to Jasper Boucher. NOTE 7`
    },
    {
        id: "new_building",
        era: "Turn of the Century (1900-1920)",
        title: "A New Sanctuary",
        icon: Church,
        text: `About 1900, Porter Wadley Lumber Company, which was located in Cotton Valley, built a railroad track from its mill into the Union Springs-Sikes' Ferry area. A logging camp was established a mile and a half east of the ferry. It was at this time that the old building, used as a church and school, was removed so a new one could be constructed. The frame building consisted of one room, which measured 30 feet by 36 feet. It was made from heart pine, 1 x 12 rough lumber planks, which were nailed uprights. Hand-split cypress shingles covered the roof; beaded lumber was used for the ceiling. Typical of the early churches, there were two front doors, and one rear door located to the speaker's left. On his right stood the organ. The three windows on each side were originally shuttered, but were later encased with glass panes. Three sections for the worshipers placed the men on the preacher's right, the ladies on his left, and the young people in the center. At that time, the attendance at church services was usually about thirty persons; cards were given out in Sunday School. NOTE 8`
    },
    {
        id: "school_1910",
        era: "Turn of the Century (1900-1920)",
        title: "School Expansion",
        icon: BookOpen,
        text: `In 1910, a new school was built across the road, two-tenths of a mile north of the Union Springs Church. Whereas school sessions had lasted only two or three months a year in the original log building, the sessions now were extended to seven months a year. NOTE 9`
    },
    {
        id: "services_details",
        era: "Turn of the Century (1900-1920)",
        title: "Sunday Services",
        icon: Users,
        text: `During church services, pallets were placed in the corner for the convenience of mothers with babies. If the babies became restless and cried, they were taken outside by Jess Cox or John "Bus" Perkins, who took turns calming the babies. The known pastors, Brother Strickland and Brother Nealy, preached once a month. Brother Strickland lived at Timothy and drove to Union Springs in a buggy or rode a horse whenever he preached. He usually stayed overnight in the community with the John Perkins family or other families of the congregation. The deacons were: Nelson Slack, who married Dochia Martin; Walter Jacob Teutsch, who married Martha Leona Nealy; and Henry James Nealy Sr., who married Delilie Elizabeth Dick. NOTE 10`
    },
    {
        id: "music_1920",
        era: "Turn of the Century (1900-1920)",
        title: "Music & Revivals",
        icon: Users,
        text: `By 1920, Treabie Martin Rives, sister of Rayford Martin, was the organist and Clyde Martin was the song leader. Treabie possessed many musical talents; she played not only the organ, but also the piano, flute, mandolin, fiddle, and guitar. When revivals were in progress, the members traveled by various means of transportation, usually by wagon. They attempted to arrive early enough to get a shady spot in which to hitch the mules that pulled their wagons. Likewise, the members vied for a seat near an open window so they could benefit in hot weather from the cooler outside breezes. The ladies brought food for dinner-on-the-ground in trunks. Why? Because they had good lids and sturdy handles.`
    },
    {
        id: "anecdotes",
        era: "Turn of the Century (1900-1920)",
        title: "Local Legends",
        icon: HistoryIcon,
        text: `Usually several men stood on the outside during the services. It is told that Troy Sinclair attempted to steal Tom Wiley's daughter, Velma Mae, one night. Sounds of pistol shots rang out, and Camille, her sister, held Velma Mae so she could not escape. Troy and Velma Mae were never married. One night the men outside were especially noisy. A woman seated in the back of the church suddenly rushed up to the front. Grasping the lamp on the speaker's stand, the only light in the room, she said to the preacher: "Them boys is fightin' like hell out yonder and I've got to see what's goin' on." With that, she ran outside with the lamp. The preacher continued his sermon in the dark. NOTE 11`
    },
    {
        id: "oil_discovery",
        era: "The Oil Boom (1921-1930)",
        title: "Black Gold",
        icon: Droplets,
        text: `The Louisiana Oil Refining Company, on March 3, 1921, made the first oil discovery in Webster Parish. The well was the Gleason #1, drilled on land owned by W. T. Gleason. The well was located only a few yards north of the Union Springs Church: Section 13, Township 22 North, and Range 10 West. Using this first well, the company drilled the second well in April. NOTE 12`
    },
    {
        id: "wild_well",
        era: "The Oil Boom (1921-1930)",
        title: "The Wild Well",
        icon: Droplets,
        text: `Drilling those first wells created much excitement. Three crews, composed of five men each, worked around the clock. Tom Wiley cut the timbers for the wood derrick. On April 7, 1921, two hundred or more people were present to watch the well "come in" as their anticipation heightened, the pipe in the hole "cut loose." The well was wild! Gas began gushing from every hole down the hill in the Dorcheat bottoms. The blowing of the gas could be heard as far away as Cotton Valley. For several miles, craters formed through crayfish holes and any other crevices in the earth's surface. Thousands of people came to see the well and the fury of its fires. Oil men came to observe the spectacle. People walked, rode mules and horses, and traveled in wagons, buggies, and cars; they wanted to view this once-in-a-lifetime happening. The churchyard became a parking lot for the spectators. Nig Crouch ran a store at Union Springs, selling sandwiches and chili to the people. Leon Roseberry set up a stand to sell cokes.`
    },
    {
        id: "crater",
        era: "The Oil Boom (1921-1930)",
        title: "The Crater Forms",
        icon: HistoryIcon,
        text: `The oil workers attempted to drill a relief well between Gleason #1 and Gleason #2. To put mud and cement into the well should have reduced the gas pressure. Nothing worked; therefore, they finally abandoned the well. A month later, the oil company brought in a work-over rig. Suddenly the bottom of the pit sank to the depth of a hundred feet--only moments before, John Slack had been standing on a board lying across the slush pit. As the well fell inward; the derrick fell to the side. Before the derrick could sink into the gaping void, the men rushed to save the engine, boiler, and crown block. Miraculously, no one was injured or killed. As the sides caved in, the hole became wider and wider. The wild well continued to be an attraction. Oil and gas sprayed into the air from the well. It was told that Tobe Newsom, riding his mule, galloped by H. L. Martin and yelled, "Hell has opened up down there." A year later, the well caught fire and burned steadily for two years or more. The fire finally died out when the drilling of "Bub" Martin's oil well relieved the pressure on the Crater. NOTE 13`
    },
    {
        id: "aftermath",
        era: "The Oil Boom (1921-1930)",
        title: "Community Impact",
        icon: Users,
        text: `The blowing well created much fear in the citizens; the school students were moved back to the church. Some parents refused to let their children attend because of the proximity of the blazing pit. Later, the school was closed and all pupils transferred to the schools located at New Shongaloo, Old Union at Leton, or Evergreen. Nelson Slack drove the school bus to New Shongaloo; Joe Parker to Evergreen. Today the Crater remains as an attraction and news item. It is a hole that measures two hundred feet deep and two hundred feet wide. Tall sweet myrtles thrive along the edges and at the bottom. Narrow trails meander down its sides where children often have played. For years, the deep pool of clear salt water was a favorite swimming spot.`
    },
    {
        id: "economy_impact",
        era: "The Oil Boom (1921-1930)",
        title: "Economic Shift",
        icon: Droplets,
        text: `Needless to say, the first oil wells drilled helped the economy of the region. Before the Gleason #1 and #2 were drilled, land had been leased for seventy-five cents an acre. Afterwards, land was leased for one hundred dollars or more per acre.`
    },
    {
        id: "disrepair",
        era: "Reorganization (1930-1940)",
        title: "Years of Silence",
        icon: Church,
        text: `The fear of the Crater, or other reasons, caused many to leave Union Springs Church. Some moved their membership to Old Union; others to Liberty Hill; and some to Mt. Paran. The church became inactive for almost twelve years, except for an occasional revival by the Pentecostals from King's Corner. Time took its toll on the sanctuary; finally, the window needed to be replaced, the roof leaked, and the entrance steps rotted. The church was in a state of disrepair.`
    },
    {
        id: "reorganization",
        era: "Reorganization (1930-1940)",
        title: "Rekindling the Flame",
        icon: Church,
        text: `In 1933, J. L. Johnson, from the Beech Springs Church in Minden, visited the Union Springs Church, His suggestion for, and interest in, the establishment of a mission church in the old building rekindled an interest. For those Baptists who began to attend, Rev. J. L. Munn and Rev. Johnson preached. Mrs. Ma Munn played the organ. Another member of Mt. Paran Baptist Church, Marion Branton, also attended. NOTE 14`
    },
    {
        id: "new_church_plans",
        era: "Reorganization (1930-1940)",
        title: "Rebuilding",
        icon: Users,
        text: `On the first Sunday in August of 1933, a group of twelve persons decided to reorganize the church. The charter members of Union Springs Baptist Church included Clara Smith, Martha Teutsch, L. M. Nealy, Lee Strange, R. W. Harris, Effie Lee Harris, Mrs. A. E. Teutsch, Lillian Bingle, Minnie Slack, N. J. Harris, Lucy Lewis, and Mrs. N.J. Harris. At a called community meeting, the members proposed to remove the old building and erect a new church. When certain ones in the audience objected, the leaders suggested that the church be constructed beside the old one. To this proposal, they also objected. Because ancestors had built the original church and the feasibility of raising funds was doubted, many in the congregation refused to agree. Under the guidance of Rev. Johnson, some members decided to organize their own church and to construct a new building across the highway. Treabie Rives had the only typewriter in the community: therefore, she chosen to compose and type a request for funds. NOTE 15`
    },
    {
        id: "gleason_donation",
        era: "Reorganization (1930-1940)",
        title: "Gleason Donation",
        icon: MapPin,
        text: `The original twelve requested that Mr. W. T. Gleason donate land on which to build a new church. He willingly agreed, if they proved to be sincere. He gave his permission for the members to cut the timber on the selected area and to begin the construction. After felling the trees with their axes and clearing the debris, the members split pine poles for the floor joists and hauled rocks for the foundation. When Mr. Gleason realized that the group's sincerity had been verified by works, he proceeded to legally deed them the land. On January 5, 1940, W. T. Gleason, husband of Annie C. Gleason, in a cash deed to Union Springs Missionary Baptist Church, donated a plot of land (150 feet by 150 feet), west of the road, across from the non-denominational church, to hold forever for church purposes only, minerals excluded, witnessed by T. J. Campbell and A. E. Collinsworth. At the time, W. T. Gleason was the only surviving member of the Board of Trustees of the Union Springs school and non-denominational church. He also made a cash donation of twenty-five dollars, with which they purchased studs for framing the building. Not wanting to be in debt, they bought additional materials needed as money was available; the men did the carpentry work themselves. The members obtained the necessary money--Lon Nealy and Rudolph Teutsch, being the chief money-raisers. The piano was given by Robert Harris.`
    },
    {
        id: "ordination",
        era: "Reorganization (1930-1940)",
        title: "Ordination Service",
        icon: Church,
        text: `During the construction of the new sanctuary, the members continued to worship in the old church. They called J. L. Johnson, of Minden, as their pastor; Mrs. Lucy Lewis served as the clerk. Thirteen new members were baptized. An ordination service was held on the first Sunday in August 1933. The candidates ordained as deacons were: Melvin Teutsch and Robert Harris. The deacons who enacted the decrees included: J.C. McCann; Lewis Munn; Marion Branton; J. L. Johnson; and A. B. Roland from Springhill. A Bible class was organized; and the church joined the North Louisiana Baptist Association.`
    },
    {
        id: "dates_discrepancy",
        era: "Reorganization (1930-1940)",
        title: "Historical Records",
        icon: HistoryIcon,
        text: `According to the minutes of the Association, the Union Springs Church was constituted in 1895. Minutes for the year 1941, and subsequent years, indicated the church's being constituted in 1933. More recent data list it as being established in 1890. Despite these discrepancies, the records show that the present Union Springs Baptist Church was constituted in 1933. NOTE 16`
    },
    {
        id: "cotton_project",
        era: "Reorganization (1930-1940)",
        title: "The Cotton Project",
        icon: Droplets,
        text: `The church, in 1934, rented land from Mr. Crayton; they planted cotton. One fourth of the profit realized was to go to Mr. Crayton; the remainder of the profit belonged to the pastor. This project was a failure as the church raised only four hundred pounds of cotton. It was not until the fourth Sunday, in August 1938, that the first services were held in the new church. A revival was held and Reverend C. C. Walker was the preacher.`
    },
    {
        id: "old_church_fate",
        era: "Modern Era (1940-Present)",
        title: "The Old Church",
        icon: Church,
        text: `When the Baptist congregation moved into the new building, the Church of Christ worshipers used the old building. They were led by a Mr. Colvin, and held services in the old church for several years. Members of this church included Jewel and Grady Farrington, Mr. and Mrs. Bobby Davis, Mr. and Mrs. O. T. Bearden, Clinton Martin, Lily Martin, and Baxter Wise. The community was told that the Church of Christ members planned to demolish the old structure. At a called meeting, the citizens learned that the group only wanted to make repairs and install new windows. After a lengthy discussion, Mr. Rayford Martin motioned that the old church be razed and that a new one be built on the same site. Most of the money to complete the work was donated that night by the congregation. Volunteers tore down the old, and using the good lumber, rebuilt the church. The old ceiling was used as wainscot for the new building. Years later the community again organized to repair the old church. Oil activity in the area made it easy to get donations; with the total of two thousand dollars or more collected, a new roof and ceiling were added, and the church given a coat of paint inside and outside. Despite the repairs, no group has ever used the church for services.`
    },
    {
        id: "pastors",
        era: "Modern Era (1940-Present)",
        title: "Pastoral Lineage",
        icon: Users,
        text: `The following pastors have served the Union Springs Baptist Church since its constitution in 1933: J. L. Johnson, 1933-1940; J. R. Nelson, 1940-1956; Roy Gordon, 1956-1957; L. B. Canterbury, 1957-1663; Robert C. Hughes, 1963-1964; E.O. Brackman, 1964-1965; Leslie L. Mills, 1965-1966; Henry S. McLaren, 1966-1967; W.L. Kelly, 1967-1969; E.N. Burns, 1970-1972; Robert J. Hughes, 1973-1975; Randolph Butler, 1976-1978; Ronnie Whitlock, 1979-1980; Albert Babin, 1981-1982; Walter Barnard, 1983-1986; Donald Tyson, 1986-1989; Floyd Stratton, 1989-1990; and Virgil Groves, 1990-Present.`
    },
    {
        id: "officials",
        era: "Modern Era (1940-Present)",
        title: "Church Officials",
        icon: Users,
        text: `The first clerk of Union Springs Baptist Church was Mrs. Lucy Lewis in 1933. From 1934, until her death in 1981, Mrs. L. M. Nealy was the church clerk. In 1981-1982, Rudolph Teursch acted as clerk: Since 1983, Gladys Parker has continued to serve in that position. In 1934-1935, the church treasurer was Mrs. Minnie Slack. From 1935, Rudolph Teutsch has continued to serve as treasurer.`
    },
    {
        id: "improvements",
        era: "Modern Era (1940-Present)",
        title: "Growth & Improvements",
        icon: MapPin,
        text: `From time to time, many improvements had to be made to the Union Springs Baptist Church. New roofs were added in 1957 and in 1981. Additional Sunday School rooms were purchased in 1981. Rest rooms were added in 1982, also a kitchen. This new addition, named Nealy Hall in honor of Mr. and Mrs. L. M. Nealy, was dedicated on December 11, 1982. The building was freshly painted after windows were installed in 1987. A new church sign was also erected at this time. In 1988, improvements consisted of an outside light, an additional classroom, new carpet, and a fan over the pulpit. In 1990, a plaque was placed in Nealy Hall by their grandchildren.`
    },
    {
        id: "deacons",
        era: "Modern Era (1940-Present)",
        title: "Dedicated Service",
        icon: Users,
        text: `Melvin Teutsch is the only living deacon among the ones who served in both the old nondenominational church and the new Union Springs Baptist Church. The other deacons who also served in both churches included: Nelson Slack; Henry James Nealy Sr., who later joined the King's Corner Pentecostal Church; Robert Harris; and Lon M. Nealy.`
    },
    {
        id: "sam_rogers",
        era: "Modern Era (1940-Present)",
        title: "Sam's Wish",
        icon: MapPin,
        text: `The cemetery at Union Springs had a unique beginning. Sam Rogers, who worked at the sawmill, had no family. When he became very ill with a fever, he requested that he be buried under the old sycamore tree that stood east of the church. In 1900, Sam died. To honor his last wish, Sam's friends buried him under the tree; however, no marker was ever placed at his resting place. There were three others buried at Union Springs in 1900: H. W. Bishop, Jessie D. Wise, and Mrs. Mary Courtney.`
    },
    {
        id: "early_burials",
        era: "Modern Era (1940-Present)",
        title: "Other Burial Sites",
        icon: MapPin,
        text: `Settlers who died prior to 1900, were entombed in a cemetery located several miles west of Leton on Highway 160 (Township 22 North, Range 9 West, Section 29). Called the Phillips-Wallace Cemetery; only a grove of crepe myrtles marks the cemetery today.`
    },
    {
        id: "committee_1979",
        era: "Preservation (1979-Present)",
        title: "Cemetery Committee",
        icon: Users,
        text: `On May 5, 1979, concerned members and descendants of the founders of Union Springs Churches and Cemetery met to form a committee for the purpose of soliciting funds for the preservation and maintenance of the cemetery. The committee consisted of these persons: Rudolph Teutsch, chairman and caretaker, Tommy Joe Wise, vice chairman; Mrs. Carlton T. McCuen, secretary and treasurer; Felton Teutsch; Tully Moore, Roy Johnson; Doris Martin; and Melvin Teutsch. A safety deposit box was rented, and Rudolph Teutsch, Lewis Nealy, and Doris Martin were appointed to keep the keys. It was decided to deposit the principal in the Citizens Bank of Springhill, with the interest earned used for the cemetery maintenance program.`
    },
    {
        id: "recent_events",
        era: "Preservation (1979-Present)",
        title: "Honoring Memory",
        icon: HistoryIcon,
        text: `On November 10, 1990, the family of Cebran "Doc" Strange erected a flagpole at the cemetery in his memory. He served in World War II and is buried in the cemetery. Since the committee was formed, Dalton Nealy replaced Tully Moore who resigned, and Jimmy Wise was named to serve when Roy Johnson died. Union Springs cemetery is a well-kept graveyard located a few miles south of Sikes’ Ferry. It is a symbol of the Union Springs ancestry, to be held dear by all future generations. The second Saturday in the month of May has been designated as a workday at the cemetery. NOTE 17`
    }
];

const footnotes = {
    1: "“Pioneer Settler of Northwest Lousiana Buried on Deer Stand in North Webster”, Bossier Banner, 30 May 1957, P.1, Col. F.",
    2: "Ardis Cawthon, et.al. History of Webster Parish Schools, 1935.",
    3: "Land Records Webster Parish, Book 7, page 370.",
    4: "North Louisiana Association Minutes, September 3, 1895, Baptist Archives, Alexandria, Louisiana.",
    5: "Cecile and Rudolph Teutsch, Lucille and Dalton Nealy, and Gladys Parker, Interview, 1989.",
    6: "Nina Slack Hardaway, Interview, 1989",
    7: "Gertrude Coyle Taylor and Cecil Taylor, Interview, 1990",
    8: "Ibid., Teutsch",
    9: "Ibid., Cawthon",
    10: "Ever Perkins Morgan, Interview, 1989",
    11: "M.D. Dean, Interview, 1989",
    12: "Martin, Hough, Raggis and Sandberg, “Genealogy of Webster Parish”, Bulletin 29, p. 129.",
    13: "“Gleason Crater”, Joy O’Bier, 1964, as an English Assignment. Her sources: John Slack and Treabie Martin Rives, widow of Frances C. Rives, one of the drillers.",
    14: "Mrs. Gwendolyne Munn Cox, Interview, 1989.",
    15: "Ibid., Teutsch; Union Springs Baptist Church Records.",
    16: "Baptist Archive Record, Alexandria, Louisiana.",
    17: "Ibid., Teutsch"
};

const HighlightedText = ({ text, highlight }) => {
    if (!highlight || !text) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 text-stone-900 rounded-sm px-0.5">{part}</mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

const TextWithFootnotes = ({ text, highlight }) => {
    const parts = text.split(/(NOTE\s*\d+)/g);
    
    return (
        <span className="leading-loose text-stone-700 block">
            {parts.map((part, index) => {
                const noteMatch = part.match(/NOTE\s*(\d+)/);
                if (noteMatch) {
                    const noteId = parseInt(noteMatch[1]);
                    const noteContent = footnotes[noteId];
                    return (
                        <Popover key={index}>
                            <PopoverTrigger asChild>
                                <button className="inline-flex items-center justify-center -mt-2 ml-1 h-5 w-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold hover:bg-teal-200 transition-colors align-super cursor-pointer z-10 relative">
                                    {noteId}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 bg-white border-stone-200 shadow-xl p-4 z-50">
                                <div className="relative">
                                    <div className="pr-6 text-sm text-stone-600 italic">
                                        <span className="font-bold text-teal-700 not-italic mr-2">Note {noteId}:</span>
                                        {noteContent}
                                    </div>
                                    <PopoverTrigger asChild>
                                        <button className="absolute -top-2 -right-2 p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </PopoverTrigger>
                                </div>
                            </PopoverContent>
                        </Popover>
                    );
                }
                return <HighlightedText key={index} text={part} highlight={highlight} />;
            })}
        </span>
    );
};

export default function HistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [recentSearches, setRecentSearches] = useState([]);
    
    useEffect(() => {
        const saved = localStorage.getItem('history_recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse recent searches");
            }
        }
    }, []);

    const handleSearch = (term) => {
        setSearchQuery(term);
        if (!term.trim()) return;

        const newRecent = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('history_recent_searches', JSON.stringify(newRecent));
    };

    const clearSearch = () => {
        setSearchQuery("");
    };

    const removeRecent = (e, term) => {
        e.stopPropagation();
        const newRecent = recentSearches.filter(s => s !== term);
        setRecentSearches(newRecent);
        localStorage.setItem('history_recent_searches', JSON.stringify(newRecent));
    };

    // Group sections by Era
    const groupedSections = historySections.reduce((acc, section) => {
        if (!acc[section.era]) {
            acc[section.era] = [];
        }
        acc[section.era].push(section);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8 -mt-[124px]">
                
                <Breadcrumbs items={[{ label: 'Our History' }]} />
                
                {/* Header */}
                <div className="text-center space-y-6">
                    <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mt-[112px]">The Story of Union Springs</h1>
                    <div className="w-24 h-1 bg-red-700 mx-auto"></div>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-6 rounded-sm shadow-md space-y-4 max-w-4xl mx-auto relative z-20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                        <Input 
                            placeholder="Search history (e.g., 'tornado', 'oil', 'Gleason')..." 
                            className="pl-10 pr-10 py-6 text-lg bg-stone-50 border-stone-200 focus-visible:ring-teal-600"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-stone-500 flex items-center gap-1"><HistoryIcon className="w-3 h-3" /> Recent:</span>
                            {recentSearches.map((term, i) => (
                                <Badge 
                                    key={i} 
                                    variant="secondary" 
                                    className="bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer pl-2 pr-1 py-1 font-normal"
                                    onClick={() => setSearchQuery(term)}
                                >
                                    {term}
                                    <X 
                                        className="w-3 h-3 ml-1 text-stone-400 hover:text-red-500" 
                                        onClick={(e) => removeRecent(e, term)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Timeline Layout */}
                <div className="relative pt-12">
                    {/* Vertical Line */}
                    <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-stone-300 transform md:-translate-x-1/2 hidden md:block" />
                    
                    <div className="space-y-16">
                        {Object.entries(groupedSections).map(([era, sections], eraIndex) => (
                            <div key={era} className="relative">
                                {/* Era Header */}
                                <div className="flex justify-center mb-12 sticky top-24 z-10">
                                    <div className="bg-stone-900 text-stone-100 px-6 py-2 rounded-full font-serif text-lg shadow-lg border-2 border-stone-200">
                                        {era}
                                    </div>
                                </div>

                                <div className="space-y-12">
                                    {sections.map((section, index) => {
                                        const isEven = index % 2 === 0;
                                        return (
                                            <div key={section.id} className={`flex flex-col md:flex-row gap-8 items-center ${isEven ? '' : 'md:flex-row-reverse'}`}>
                                                
                                                {/* Card Content */}
                                                <div className="w-full md:w-[calc(50%-2rem)]">
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 20 }}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        viewport={{ once: true, margin: "-50px" }}
                                                        transition={{ duration: 0.5 }}
                                                        className="bg-white p-6 md:p-8 rounded-sm shadow-md hover:shadow-xl transition-shadow border-t-4 border-teal-700 relative group"
                                                    >
                                                        {/* Connector Dot (Mobile Only) */}
                                                        <div className="absolute top-8 -left-3 md:hidden w-6 h-6 bg-teal-600 rounded-full border-4 border-stone-200" />

                                                        <div className="flex items-center gap-3 mb-4 text-teal-800 border-b border-stone-100 pb-3">
                                                            <section.icon className="w-5 h-5" />
                                                            <h3 className="font-serif text-xl font-bold">{section.title}</h3>
                                                        </div>
                                                        <div className="prose prose-stone prose-sm">
                                                            <TextWithFootnotes text={section.text} highlight={searchQuery} />
                                                        </div>
                                                    </motion.div>
                                                </div>

                                                {/* Center Dot (Desktop) */}
                                                <div className="hidden md:flex flex-shrink-0 w-4 h-4 bg-teal-600 rounded-full border-4 border-stone-200 z-10 shadow-sm transform transition-transform hover:scale-150" />

                                                {/* Empty Space for alignment */}
                                                <div className="hidden md:block w-[calc(50%-2rem)]" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Membership Lists - Columns */}
                <div className="mt-16 bg-white p-8 md:p-12 rounded-sm shadow-md">
                    <h2 className="text-3xl font-serif text-center text-stone-900 mb-12 border-b border-stone-200 pb-4">Historical Membership Rolls</h2>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* 1895-1910 */}
                        <div className="bg-stone-50 p-6 rounded-sm border border-stone-100">
                            <Badge className="bg-stone-800 text-white hover:bg-stone-900 mb-4 text-base px-3 py-1">1895 – 1910</Badge>
                            <ul className="space-y-2 text-sm text-stone-700 leading-relaxed">
                                {["Eli Coyle", "Evie Coyle", "W. C. Coyle", "Ida C. Gleason", "F. E. Kaylor", "W. W. Kalor", "Sarah Lunsford", "J. F. Phillips", "J. F. Phillips Jr.", "W. A. Phillips", "Pastor J. E. Williamson"].map((name, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                                        <span>{name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 1910-1915 */}
                        <div className="bg-stone-50 p-6 rounded-sm border border-stone-100">
                            <Badge className="bg-stone-800 text-white hover:bg-stone-900 mb-4 text-base px-3 py-1">1910 – 1915</Badge>
                            <ul className="space-y-2 text-sm text-stone-700 leading-relaxed">
                                {["Della Browning", "Anna Cox", "Richard Cox", "Roxie Cox", "Bertha H. Dollar", "Willie Dollar", "Cel Holiday", "W. A. King", "J. T. Perkins", "Nettie Perkins"].map((name, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                                        <span>{name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 1930 */}
                        <div className="bg-stone-50 p-6 rounded-sm border border-stone-100">
                            <Badge className="bg-stone-800 text-white hover:bg-stone-900 mb-4 text-base px-3 py-1">1930</Badge>
                            <p className="text-sm text-stone-700 leading-relaxed italic mb-2">A partial list of families...</p>
                            <div className="h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-300">
                                <ul className="space-y-2 text-sm text-stone-700">
                                    {["Lillian Bingle", "Mr. M. L. Bishop", "May Bishop", "Savina Way Castor", "Mrs. John Cole", "May Bell Dollar", "Tavy Dollar", "Zella Finlay", "Effie Lee Harris", "N. J. Harris", "Mrs. N. J. Harris", "Robert Harris", "Rosie Harris", "Wayman Harris", "Agnes King", "Bessie King", "Elmo King", "Fred C. King", "Goldie King", "Hettie King", "J. D. King", "Virgil King", "Mary Langston", "Lucy Parker Lewis", "Berta McCuin", "Nina Martin", "Justin Moore", "Vernon Moore", "Alice Nealy", "Cal Nealy", "Mrs. H. J. Nealy", "J. A. Nealy", "Mrs. L. M. Nealy", "Rosie Sinclair", "Myrtle Slack", "Morgan Strange", "Chester Strickland", "Hunter Teutsch", "Kirk Wise"].map((name, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                                            <span>{name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="outline" className="border-stone-300 text-stone-600 hover:bg-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                        </Button>
                    </Link>
                </div>

            </div>
        </div>
    );
}