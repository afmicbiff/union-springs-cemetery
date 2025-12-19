export const historyTimelineData = [
    {
        id: "intro",
        year: "1816",
        title: "Early Settlement",
        text: `As early as 1816, Jesse Sikes came to the Leton area in northwest Louisiana, and then settled on Dorcheat Bayou, where he built an Indian trading post and established a ferry. At this time, Webster Parish was still part of Natchitoches Parish. White settlers began arriving for the purpose of homesteading the area, now known as Union Springs. The ferry to cross the bayou was called Sikes' Ferry. NOTE [1]`,
        location: { lat: 32.9565, lng: -93.3121, label: "Sikes' Ferry (Dorcheat Bayou)" },
        overlay: {
            type: "circle",
            center: [32.9565, -93.3121],
            radius: 800,
            color: "#A0522D",
            label: "Early Settlement Area"
        },
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/329e2d3db_IMG-6924.jpg",
                caption: "Sikes' Ferry, 1887",
                source: "Courtesy of Tommie O'Bier"
            }
        ]
    },
    {
        id: "storm",
        year: "1830",
        title: "The Great Storm",
        text: `About 1830, there was a storm in this area. Many of the old timers called it a "harricane", but from all indications, it must have been a tornado. It cleared a path in excess of one-half mile all the way from the present Union Springs area up into Columbia County, Arkansas. The area just to the west of New Shongaloo is still called "The Harricane". A woman was killed here when her log cabin fell in on her. In 1961, Aurie Duke Morgan said there were still signs of the storm in their woods.`,
        location: { lat: 32.9450, lng: -93.3050, label: "Path of 'The Harricane'" },
        weather: {
            condition: "Tornado/Hurricane",
            temp: "N/A",
            description: "Severe storm system clearing a 0.5 mile wide path.",
            icon: "cloud-lightning"
        },
        overlay: {
            type: "polygon",
            positions: [
                [32.9300, -93.2900],
                [32.9600, -93.3200],
                [33.0500, -93.3500], // Towards Columbia County, AR
                [33.0600, -93.3300],
                [32.9400, -93.2800]
            ],
            color: "#DC2626",
            label: "Storm Path"
        },
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/cd48135f2_IMG-6920.jpg",
                caption: "Path of the 'Hurricane' (ca. 1830) as surveyed by William Dearing",
                source: "Courtesy of Tommie O'Bier"
            }
        ]
    },
    {
        id: "survey",
        year: "1835",
        title: "Government Survey",
        text: `When William Dearing surveyed the area for the government in 1835, he plotted the path of the storm and called it Hurricane. John T. Campbell, Minden lawyer, said this land was advertised back East as "already done cleared land" and everyone wanted to buy land in the Hurricane. This map, the Governmental Map of Webster Public Lands June 30, 1830, can be seen in the Clerk’s office in Minden, Louisiana.`,
        location: { lat: 32.6150, lng: -93.2850, label: "Webster Parish Clerk's Office (Minden)" }
    },
    {
        id: "spiritual",
        year: "1840s",
        title: "Spiritual Beginnings",
        text: `As more people inhabited the land, their need for spiritual guidance led to religious services being conducted in private homes, as well as meetings under the arbor structures. One favorite meeting site was the spot on which the Union Springs Church now stands. On the sides of the hill flowed numerous natural springs of water. Four springs were especially good. Their cool, clear waters flowed in all directions--northward, westward, southward, and eastward--before making their way into Dorcheat Bayou. Since there was a union of four springs on the hillside, and since Methodists, Baptists, Missionary Baptists, and Pentecostals were represented in the congregation, the name of the church was appropriately selected: Union Springs. Some say an encampment of Union soldiers here during reconstruction gave the area its name.`,
        location: { lat: 32.9365, lng: -93.2921, label: "Union Springs Church Site" }
    },
    {
        id: "school",
        year: "1850",
        title: "First School",
        text: `By 1850, the area had become a part of Claiborne Parish; and a private school was built at Union Springs. The log structure consisted of one room, which was heated by a large mud fireplace as the school term lasted two or three months during the winter. The students paid their tuitions with chickens, eggs, butter, potatoes, and other farm products. Each family was responsible for its children's transportation. NOTE [2]`,
        location: { lat: 32.9370, lng: -93.2925, label: "Original Log Schoolhouse" },
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/5dc582f27_IMG_6928.jpg",
                caption: "Union Springs School, Shongaloo, Louisiana - ca. 1895",
                source: "Courtesy of Tommie O'Bier"
            }
        ]
    },
    {
        id: "early_period",
        year: "1890",
        title: "Church Origins",
        text: `According to the deceased parents of the present generation of members, the Union Springs Church was established in 1890. The church may have been organized that year; not applying for membership in the Baptist Association until the year 1895. Unfortunately, no records for this earlier period can be found; nor is any ancestor living to verify the facts. Records at the Baptist Association Building in Alexandria, Louisiana, indicate that the Union Springs Baptist Church was constituted in 1895. No correspondence was received from the Union Springs Church to the Association during the period dating from 1895 to 1933. During this time the building was used as a church, a school, and a community assembly place. Any denomination was granted the privilege of conducting services in the church building. Whenever these religious services were held everyone-regardless of his religious convictions--came to worship. It is reported that there were great evangelistic meetings in those early days, with great preaching, vigorous singing, feet washing, and speaking in other tongues. Often these meetings lasted until early in the morning hours. NOTE 5`,
        location: { lat: 32.9365, lng: -93.2921, label: "Union Springs Baptist Church" }
    },
    {
        id: "church_services",
        year: "1894",
        title: "Land Deed",
        text: `Church services were conducted only one Sunday a month, and the school building was used. No records of Union Springs Church have been found as to its constitution. One land record shows that on July 20, 1894, John F. Phillips Sr. sold two acres of land to the trustees of Union Springs School. These trustees-- James Richard Martin; his son, H. L. Martin; William Thomas Gleason; William W. Kaylor; W. D. Crouch; George W. Holiday; Jessie O. Wise: and Ally W. Sinclair--paid five dollars for the plot of land located in Section 13, Township 22, Range 10 West, for use as a nondenominational church. NOTE [3]`,
        location: { lat: 32.9368, lng: -93.2918, label: "Land Deed Location (Section 13)" }
    },
    {
        id: "association",
        year: "1895",
        title: "Baptist Association",
        text: `In 1895, Union Springs Baptist Church wrote a petitionary letter to the North Louisiana Baptist Association. Upon its reading the church was received as a member of the Association and the messengers were given the handshake of fellowship. The association was held at the New Friendship Baptist Church on September 3, 1895, in Claiborne Parish, Louisiana. The pastor of Union Springs was J.E. Williamson, the clerk was J. F. Phillips Jr.; the church was valued at one hundred fifty dollars, which included the value of the organ. Other statistics included the church's donation of one dollar for associational purposes. The total membership thirteen worshipers: four men and nine women. One member was added by baptism, and one was lost by letter. At this time, there was a post office at Dorcheat Louisiana. NOTE [4]`,
        location: { lat: 32.8500, lng: -93.0500, label: "New Friendship Baptist Church" }
    },
    {
        id: "coyle",
        year: "1899",
        title: "A Winter Tale",
        text: `E. M. "Eli" Coyle (1860-1928), who married Mary Sarepta Lennard, lived on the road to Cox's Ford north of Union Springs. A sad, but interesting, story is told about their daughter Eva Mae. She died on February 17, 1899; her body was to be buried in Old Sarepta Cemetery. A severe winter storm had frozen solid Dorcheat Bayou. The ferry was inoperative; therefore, John Slack, Minnie Dollar's husband and Nina Hardaway's father, assisted Claiborne Lindsey, Ida Sikes' brother, to push the coffin across the ice so the body could be buried as planned. NOTE 6 Her funeral was held on the day that she was to be married to Jasper Boucher. NOTE 7`,
        location: { lat: 32.8950, lng: -93.4500, label: "Old Sarepta Cemetery" },
        weather: {
            condition: "Deep Freeze",
            temp: "< 32°F",
            description: "Bayou Dorcheat frozen solid, allowing passage on ice.",
            icon: "snowflake"
        }
    },
    {
        id: "new_building",
        year: "1900",
        title: "New Building & Railroad",
        text: `About 1900, Porter Wadley Lumber Company, which was located in Cotton Valley, built a railroad track from its mill into the Union Springs-Sikes' Ferry area. A logging camp was established a mile and a half east of the ferry. It was at this time that the old building, used as a church and school, was removed so a new one could be constructed. The frame building consisted of one room, which measured 30 feet by 36 feet. It was made from heart pine, 1 x 12 rough lumber planks, which were nailed uprights. Hand-split cypress shingles covered the roof; beaded lumber was used for the ceiling. Typical of the early churches, there were two front doors, and one rear door located to the speaker's left. On his right stood the organ. The three windows on each side were originally shuttered, but were later encased with glass panes. Three sections for the worshipers placed the men on the preacher's right, the ladies on his left, and the young people in the center. At that time, the attendance at church services was usually about thirty persons; cards were given out in Sunday School. NOTE 8`,
        location: { lat: 32.9600, lng: -93.3000, label: "Logging Camp East of Ferry" }
    },
    {
        id: "sam_rogers",
        year: "1900",
        title: "Sam Rogers",
        text: `The cemetery at Union Springs had a unique beginning. Sam Rogers, who worked at the sawmill, had no family. When he became very ill with a fever, he requested that he be buried under the old sycamore tree that stood east of the church. In 1900, Sam died. To honor his last wish, Sam's friends buried him under the tree; however, no marker was ever placed at his resting place. There were three others buried at Union Springs in 1900: H. W. Bishop, Jessie D. Wise, and Mrs. Mary Courtney.`,
        location: { lat: 32.9365, lng: -93.2920, label: "The Old Sycamore (First Grave)" }
    },
    {
        id: "school_1910",
        year: "1910",
        title: "School Expansion",
        text: `In 1910, a new school was built across the road, two-tenths of a mile north of the Union Springs Church. Whereas school sessions had lasted only two or three months a year in the original log building, the sessions now were extended to seven months a year. NOTE 9`,
        location: { lat: 32.9390, lng: -93.2921, label: "1910 Schoolhouse Site" },
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/30847748b_IMG-6921.jpg",
                caption: "Union Springs School Class Photo",
                source: "Courtesy of Barry W. Slack"
            }
        ]
    },
    {
        id: "services_details",
        year: "1910s",
        title: "Church Life",
        text: `During church services, pallets were placed in the corner for the convenience of mothers with babies. If the babies became restless and cried, they were taken outside by Jess Cox or John "Bus" Perkins, who took turns calming the babies. The known pastors, Brother Strickland and Brother Nealy, preached once a month. Brother Strickland lived at Timothy and drove to Union Springs in a buggy or rode a horse whenever he preached. He usually stayed overnight in the community with the John Perkins family or other families of the congregation. The deacons were: Nelson Slack, who married Dochia Martin; Walter Jacob Teutsch, who married Martha Leona Nealy; and Henry James Nealy Sr., who married Delilie Elizabeth Dick. NOTE 10`,
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/f2a11f1df_IMG-6923.jpg",
                caption: "Graveyard working and dinner on the ground at Old Shongaloo, ca. 1949",
                source: "Courtesy of Tommie O'Bier"
            }
        ]
    },
    {
        id: "music_1920",
        year: "1920",
        title: "Music Ministry",
        text: `By 1920, Treabie Martin Rives, sister of Rayford Martin, was the organist and Clyde Martin was the song leader. Treabie possessed many musical talents; she played not only the organ, but also the piano, flute, mandolin, fiddle, and guitar.`
    },
    {
        id: "oil_discovery",
        year: "1921",
        title: "Oil Discovery",
        text: `The Louisiana Oil Refining Company, on March 3, 1921, made the first oil discovery in Webster Parish. The well was the Gleason #1, drilled on land owned by W. T. Gleason. The well was located only a few yards north of the Union Springs Church: Section 13, Township 22 North, and Range 10 West. Using this first well, the company drilled the second well in April. NOTE 12`,
        location: { lat: 32.9375, lng: -93.2921, label: "Gleason #1 Well" },
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/58410705a_IMG-6927.jpg",
                caption: "Gleason Well - 1921. First oil well drilled in Webster Parish.",
                source: "Courtesy of Tommie O'Bier"
            }
        ]
    },
    {
        id: "wild_well",
        year: "Apr 1921",
        title: "The Wild Well",
        text: `Drilling those first wells created much excitement. Three crews, composed of five men each, worked around the clock. Tom Wiley cut the timbers for the wood derrick. On April 7, 1921, two hundred or more people were present to watch the well "come in" as their anticipation heightened, the pipe in the hole "cut loose." The well was wild! Gas began gushing from every hole down the hill in the Dorcheat bottoms. The blowing of the gas could be heard as far away as Cotton Valley. For several miles, craters formed through crayfish holes and any other crevices in the earth's surface. Thousands of people came to see the well and the fury of its fires. Oil men came to observe the spectacle. People walked, rode mules and horses, and traveled in wagons, buggies, and cars; they wanted to view this once-in-a-lifetime happening. The churchyard became a parking lot for the spectators. Nig Crouch ran a store at Union Springs, selling sandwiches and chili to the people. Leon Roseberry set up a stand to sell cokes.`,
        location: { lat: 32.9380, lng: -93.2930, label: "Wild Well Site" },
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/ad7dce04d_IMG-6925.jpg",
                caption: "Gleason Well - 1921",
                source: "Courtesy of Tommie O'Bier"
            }
        ],
        overlay: {
            type: "circle",
            center: [32.9380, -93.2930],
            radius: 300,
            color: "#F59E0B",
            label: "Gas Blowout Zone"
        }
    },
    {
        id: "crater",
        year: "1921-23",
        title: "The Crater",
        text: `The oil workers attempted to drill a relief well between Gleason #1 and Gleason #2. To put mud and cement into the well should have reduced the gas pressure. Nothing worked; therefore, they finally abandoned the well. A month later, the oil company brought in a work-over rig. Suddenly the bottom of the pit sank to the depth of a hundred feet--only moments before, John Slack had been standing on a board lying across the slush pit. As the well fell inward; the derrick fell to the side. Before the derrick could sink into the gaping void, the men rushed to save the engine, boiler, and crown block. Miraculously, no one was injured or killed. As the sides caved in, the hole became wider and wider. The wild well continued to be an attraction. Oil and gas sprayed into the air from the well. It was told that Tobe Newsom, riding his mule, galloped by H. L. Martin and yelled, "Hell has opened up down there." A year later, the well caught fire and burned steadily for two years or more. The fire finally died out when the drilling of "Bub" Martin's oil well relieved the pressure on the Crater. NOTE 13`,
        location: { lat: 32.9380, lng: -93.2930, label: "The Crater" },
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/3b59c4846_IMG-6926.jpg",
                caption: "Gleason Well cratered, forming a hole 200' wide x 200' deep.",
                source: "Courtesy of Geology of Webster Parish, Louisiana, p. 94."
            }
        ]
    },
    {
        id: "aftermath",
        year: "1920s",
        title: "Aftermath of the Fire",
        text: `The blowing well created much fear in the citizens; the school students were moved back to the church. Some parents refused to let their children attend because of the proximity of the blazing pit. Later, the school was closed and all pupils transferred to the schools located at New Shongaloo, Old Union at Leton, or Evergreen. Nelson Slack drove the school bus to New Shongaloo; Joe Parker to Evergreen. Today the Crater remains as an attraction and news item. It is a hole that measures two hundred feet deep and two hundred feet wide. Tall sweet myrtles thrive along the edges and at the bottom. Narrow trails meander down its sides where children often have played. For years, the deep pool of clear salt water was a favorite swimming spot.`
    },
    {
        id: "reorganization",
        year: "1933",
        title: "Reorganization",
        text: `In 1933, J. L. Johnson, from the Beech Springs Church in Minden, visited the Union Springs Church, His suggestion for, and interest in, the establishment of a mission church in the old building rekindled an interest. For those Baptists who began to attend, Rev. J. L. Munn and Rev. Johnson preached. Mrs. Ma Munn played the organ. Another member of Mt. Paran Baptist Church, Marion Branton, also attended. On the first Sunday in August of 1933, a group of twelve persons decided to reorganize the church. NOTE 14 NOTE 15`
    },
    {
        id: "new_church_plans",
        year: "Aug 1933",
        title: "Building the New Church",
        text: `The charter members of Union Springs Baptist Church included Clara Smith, Martha Teutsch, L. M. Nealy, Lee Strange, R. W. Harris, Effie Lee Harris, Mrs. A. E. Teutsch, Lillian Bingle, Minnie Slack, N. J. Harris, Lucy Lewis, and Mrs. N.J. Harris. At a called community meeting, the members proposed to remove the old building and erect a new church. When certain ones in the audience objected, the leaders suggested that the church be constructed beside the old one. To this proposal, they also objected. Because ancestors had built the original church and the feasibility of raising funds was doubted, many in the congregation refused to agree. Under the guidance of Rev. Johnson, some members decided to organize their own church and to construct a new building across the highway. Treabie Rives had the only typewriter in the community: therefore, she chosen to compose and type a request for funds. NOTE 15`
    },
    {
        id: "cotton_project",
        year: "1934",
        title: "Cotton Project",
        text: `The church, in 1934, rented land from Mr. Crayton; they planted cotton. One fourth of the profit realized was to go to Mr. Crayton; the remainder of the profit belonged to the pastor. This project was a failure as the church raised only four hundred pounds of cotton. It was not until the fourth Sunday, in August 1938, that the first services were held in the new church. A revival was held and Reverend C. C. Walker was the preacher.`
    },
    {
        id: "gleason_donation",
        year: "1940",
        title: "Gleason Donation",
        text: `On January 5, 1940, W. T. Gleason, husband of Annie C. Gleason, in a cash deed to Union Springs Missionary Baptist Church, donated a plot of land (150 feet by 150 feet), west of the road, across from the non-denominational church, to hold forever for church purposes only. At the time, W. T. Gleason was the only surviving member of the Board of Trustees of the Union Springs school and non-denominational church. He also made a cash donation of twenty-five dollars. Not wanting to be in debt, they bought additional materials needed as money was available; the men did the carpentry work themselves.`,
        media: [
            {
                type: "image",
                url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/8876a89d0_IMG-6922.jpg",
                caption: "Graveyard working, Old Shongaloo Cemetery, ca. 1910",
                source: "Courtesy of Tommie O'Bier"
            }
        ]
    },
    {
        id: "improvements",
        year: "1957-90",
        title: "Improvements & Additions",
        text: `From time to time, many improvements had to be made to the Union Springs Baptist Church. New roofs were added in 1957 and in 1981. Additional Sunday School rooms were purchased in 1981. Rest rooms were added in 1982, also a kitchen. This new addition, named Nealy Hall in honor of Mr. and Mrs. L. M. Nealy, was dedicated on December 11, 1982. The building was freshly painted after windows were installed in 1987. A new church sign was also erected at this time. In 1988, improvements consisted of an outside light, an additional classroom, new carpet, and a fan over the pulpit. In 1990, a plaque was placed in Nealy Hall by their grandchildren.`
    },
    {
        id: "committee_1979",
        year: "1979",
        title: "Cemetery Committee",
        text: `On May 5, 1979, concerned members and descendants of the founders of Union Springs Churches and Cemetery met to form a committee for the purpose of soliciting funds for the preservation and maintenance of the cemetery. The committee consisted of these persons: Rudolph Teutsch, chairman and caretaker, Tommy Joe Wise, vice chairman; Mrs. Carlton T. McCuen, secretary and treasurer; Felton Teutsch; Tully Moore, Roy Johnson; Doris Martin; and Melvin Teutsch.`
    },
    {
        id: "recent_events",
        year: "1990",
        title: "Recent Events",
        text: `On November 10, 1990, the family of Cebran "Doc" Strange erected a flagpole at the cemetery in his memory. He served in World War II and is buried in the cemetery. Since the committee was formed, Dalton Nealy replaced Tully Moore who resigned, and Jimmy Wise was named to serve when Roy Johnson died. Union Springs cemetery is a well-kept graveyard located a few miles south of Sikes’ Ferry. It is a symbol of the Union Springs ancestry, to be held dear by all future generations. The second Saturday in the month of May has been designated as a workday at the cemetery. NOTE 17`
    }
];

export const footnotes = {
    1: "“Pioneer Settler of Northwest Louisiana Buried on Deer Stand in North Webster”, Bossier Banner, 30 May 1957, P.1, Col. F.",
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

export const membershipLists = [
    {
        era: "1895 – 1910",
        names: "Eli Coyle, Evie Coyle, W. C. Coyle, Ida C. Gleason, F. E. Kaylor, W. W. Kalor, Sarah Lunsford, J. F. Phillips, J. F. Phillips Jr., W. A. Phillips, and Pastor J. E. Williamson."
    },
    {
        era: "1910-1915",
        names: "Della Browning, Anna Cox, Richard Cox, Roxie Cox, Bertha H. Dollar, Willie Dollar, Cel Holiday, W. A. King, J. T. Perkins, and Nettie Perkins."
    },
    {
        era: "1930",
        names: "Lillian Bingle, Mr. M. L. Bishop, May Bishop, Savina Way Castor, Mrs. John Cole, May Bell Dollar, Tavy Dollar, Zella Finlay, Effie Lee Harris, N. J. Harris, Mrs. N. J. Harris, Robert Harris, Rosie Harris, Wayman Harris, Agnes King, Bessie King, Elmo King, Fred C. King, Goldie King, Hettie King, J. D. King, Virgil King, Mary Langston, Lucy Parker Lewis, Berta McCuin, Nina Martin, Justin Moore, Vernon Moore, Alice Nealy, Cal Nealy Mrs. H. J. Nealy, J. A. Nealy, Mrs. L. M. Nealy, Rosie Sinclair, Myrtle Slack, Morgan Strange, Chester Strickland, Hunter Teutsch, and Kirk Wise."
    },
    {
        era: "1940s",
        names: "Myte Bearden, Marzelle Crouch, Odie Crouch, Pauline Dollar, Annie Franklin, Marilyn Hollinsworth, Ruthie Humphrey, Dorothy May Johnson, Ebbie Johnson, Elsie Johnson, Listerine Johnson, Norene Johnson, Louise King, Annie Franklin Lindsey, Claiborne Lindsey, Ever Lindsey, Filda Lindsey, J. F. Lindsey, Pearl Lindsey, Roy Lindsey, Ernestine Long, Willie Long, Christine Martin, Perry Merritt, Vernice Merrit, Charleen Nealy, Earlene Nealy, Erma Fay Nealy, Beatrice O'Neal, Emma Lee Peterson, Love Ratcliff, Della Mac Strange, Gene Teutsch, Roy Teutsch, W. J. Teutsch, Blanch Wise, Inez Wise, and Patsy Wise."
    },
    {
        era: "1950s",
        names: "B. B. Adkins, Mrs. B. B. Adkins, Davis Adkins, Johnny Ray Adkins, C. J. Barmore, Mrs. C.J. Barmore, Randy Barmore, Sherry Branton, Shirley Branton, Mr. & Mrs. L. B. Canterberry, Jewel Cox, Mr. & Mrs. A. T. Crawford, Betty Joe Franklin, Dianne Gordon, Rev. and Mrs. Roy Gordon, Tommy Gordon, Tulla Ann Lindsey, W. D. Lindsey, Frank Little, Roy McCuin, Patsy Peterson, Betty Rattliff, Huey Ratcliff, Trebie Reeves, Harem Robinson, Charles Slack, Roger Slack, Tommy Slack, Sam Smith, Flora Strange, Nobie Strange, Arthur Earl Teutsch, Felton Teutsch, Gladys Teutsch, Mittie Teutsch, Mr. Veatch, Johnny Veatch, Sue Veatch, and Mrs. T. F. Veatch."
    },
    {
        era: "1960s",
        names: "Lillian Branton, Donald Campbell, Randal Campbell, Albert Cox, William T. Davis, Rev. Robert C. Hughes, Rev. & Mrs. W. L. Kelly, Rev. Henry McLaren, Sue Merritt, Tommy Merritt, Larry Miller Jr., Bro. Lestie Mills, Tullie Moore, Sally Murphy, Della Nealy, Dianne Ratcliff, Becky Slack, Lona Strickland, Sandra J. Teutsch, Nellie Wiley, J. V. Wiley, and Carolyn Wise."
    },
    {
        era: "1970s",
        names: "Rev. E. N. Burns, Mr. & Mrs. T. V. Colvin, Mr. & Mrs. Robert J. Hughes, Jon Ellis Miller, Terry Joe Miller, Huey Ratcliff Jr., Bro. Ronnie Whitlock, and Retha G. Whitlock."
    },
    {
        era: "1980s",
        names: "Rev. Albert Babbin, Mrs. Donna Babbin, Tanya Babin, Tara Babin, Don Campbell, Virginia Campbell, Tammy Blackmon Davis, Charlotte Driver, Mr. & Mrs. W. L. Gryder, Nina Hardaway, Laura Morgan, Mrs. W. J. Taylor, BarbaraH. Tyson, and Don E. Tyson."
    },
    {
        era: "1990s",
        names: "Cartie Campbell, Katie Campbell, Eunice T. Ratcliff Fields, R. L. Fields, Frankie Strickland Foster, Minnie Nealy Gryder, James H. Kelly, Peggy Lyn Kelly, Dalton Nealy, Lucille Neal, Gladys Parker, Marie Teutsch Simmons, Mrs. Hoyt Slack, Cecile Teutsch, Janet Kay Sanders Teutsch, Melvin Teutsch, Rudolph Teutsch, R. D. Teutsch, and Mike Sanders."
    },
    {
        era: "Undated Records",
        names: "Daut Branton, Arthur Branton, Green Coleman, Clemmie Coursey, J.B. Cox, Blanchie Davis, R. H. Davis, A. C. Dick, Mrs. Garrett, Lillian Hardaway, Velma G. Hough, Brad Howell, Orie B. Howell, Velma Johnson, Gid Jones, Lillie Martin, Mattie Martin, Minervie Martin, Pearl Martin, Minnie Martin, T. J. Martin, Trebie Martin, Armer Mashaw, Velma Knott Moore, Edgar Morris, Jean Murphy, J. B. Murrel, Hettie B. Nealy, H. J. Nealy, Lon M. Nealy, W. A. Phillips, S. W. Rogers, Gladys Shaddin, Willie Shaddin, Dave Sinclair, Dochie Lee Slack, John Slack, Lillie Estelle Slack, Lula Slack, Minnie Dollar Slack, W. Nelson Slack, Clara Smith, Lee Strange, Elizer Teutsch, Lucy Teutsch, Martha Teutsch, Ollie Teutsch, Ella Warren, J. D. Wise, Mary Wise, Ora Wise, Rosie Ella Wise, and W. E. Wise."
    }
];