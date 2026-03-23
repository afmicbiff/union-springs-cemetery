import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
        if (user.role !== 'admin') { return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 }); }
        
        // Raw data from the user prompt
        const rawData = `1	A-1	Available								Section 1
2	A-1	Occupied	Boutwell	Paul Marshall	5/25/1901	9/3/1982	Boutwell		Find a Grave	Section 1
3	A-1	Occupied	Boutwell	Clara Martin	11/15/1907	1/31/1995	Boutwell		Find a Grave	Section 1
4	B-1	Reserved					Slack, Hoyt			Section 1
5	B-1	Reserved					Slack, Hoyt			Section 1
6	B-1	Reserved					Slack, Hoyt			Section 1
7	B-1	Reserved					Slack, Hoyt			Section 1
8	B-1	Occupied	Slack	Zachary Neal	11/11/1984	4/9/1999	Slack		Find a Grave	Section 1
9	C-1	Reserved	Slack	Tom L.	7/6/1941		Slack			Section 1
10	C-1	Occupied	Slack	Pamela D.	12/29/1940	4/2/1999	Slack		Find a Grave	Section 1
11	C-1	Occupied	Slack	Hoyt	12/27/1907	1/30/1998	Slack		Find a Grave	Section 1
12	C-1	Occupied	Slack	Marjorie Kathleen McLaughlin	5/6/1917	8/10/2011	Slack		Find a Grave	Section 1
13	C-1	Reserved					Roach, Pauline Dollar			Section 1
14	D-1	Reserved					Roach, Pauline Dollar			Section 1
15	D-1	Reserved					Roach, Pauline Dollar			Section 1
16	D-1	Reserved					Roach, Pauline Dollar			Section 1
17	D-1	Occupied	Roach	Pauline Dollar	6/4/1932	12/11/1997	Roach		Find a Grave	Section 1
18	D-1	Reserved					Roach, Pauline Dollar			Section 1
19	E-1	Reserved					Roach, Pauline Dollar			Section 1
20	E-1	Occupied	Mills	Ronald Edward "Ronnie"	11/22/1950	1/26/2006	Mills	Vet/Navy	Find a Grave	Section 1
21	E-1	Reserved					Roach, Pauline Dollar			Section 1
22	E-1	Occupied	Rives	Francis C. "Jack"	8/9/1895	12/8/1975	Rives	Vet/Army/CPL/WWI	Find a Grave	Section 1
23	E-1	Occupied	Rives	Treabie Martin	2/3/1890	6/3/1985	Rives		Find a Grave	Section 1
24	A-1	Occupied	Giddings	Tammy Jewel	4/7/1970	10/23/2010	Giddings		Find a Grave	Section 1
25	A-1	Occupied	Tilley	Billy Wayne	2/1/1969	3/20/1989	Tilley		Find a Grave	Section 1
26	A-1	Occupied	Godley	Stella Jean Strange	7/1/1949	7/13/2018	Tilley		Find a Grave	Section 1
27	B-1	Occupied	Godley	Charles Fred	4/1/1932	9/19/2008	Godley	Vet/Army/SGT/Korea/Vietnam	Find a Grave	Section 1
28	B-1	Reserved					Mason, Bobby			Section 1
29	B-1	Reserved					Mason, Bobby			Section 1
30	B-1	Reserved					Mason, Bobby			Section 1
31	B-1	Reserved					Mason, Bobby			Section 1
32	C-1	Reserved					Mason, Bobby			Section 1
33	C-1	Reserved					Mason, Bobby			Section 1
34	C-1	Reserved					Mason, Bobby			Section 1
35	C-1	Occupied	Craig	Charles Lee	6/151938	4/262011	Craig		Find a Grave	Section 1
36	C-1	Reserved					Slack, Hoyt			Section 1
37	D-1	Reserved					Slack, Hoyt			Section 1
38	D-1	Reserved					Slack, Hoyt			Section 1
39	D-1	Reserved					Magee			Section 1
40	D-1	Reserved					Magee			Section 1
41	D-1	Reserved					Magee, Mike			Section 1
42	E-1	Occupied	Magee	Lucille Lyvinue McCuen	2/3/1927	10/28/2017	Magee		Find a Grave	Section 1
43	E-1	Occupied	Magee	Charles Darvin "Chuck"	9/23/1963	1/5/1998	Magee		Find a Grave	Section 1
44	E-1	Reserved					Moore, Tullie			Section 1
45	E-1	Reserved					Moore, Tullie			Section 1
46	E-1	Occupied	Moore	Robert Elmer	9/17/1910	8/29/2000	Moore		Find a Grave	Section 1
47	A-2	Reserved					Mason, Bobby			Section 1
48	A-2	Reserved					Mason, Bobby			Section 1
49	A-2	Reserved					Mason, Bobby			Section 1
50	B-2	Reserved					Mason, Bobby			Section 1
51	B-2	Reserved					Mason, Bobby			Section 1
52	B-2	Reserved					Mason, Bobby			Section 1
53	B-2	Reserved					Mason, Bobby			Section 1
54	B-2	Reserved					Mason, Bobby			Section 1
55	C-2	Reserved					Mason, Bobby			Section 1
56	C-2	Occupied	Mason	Heather	4/26/1979	11/15/2024	Mason, Bobby		Find a Grave	Section 1
57	C-2	Occupied	Mason	Bobby Gene	3/3/1936	9/24/1998	Mason		Find a Grave	Section 1
58	C-2	Occupied	Mason	Wanda Faye Strange	9/24/1939	11/17/2010	Strange	2 spaces here	Find a Grave	Section 1
59	C-2	Occupied	Dillon	Larry Wayne "Zarten"	8/15/1972	8/13/2017	Dillon		Find a Grave	Section 1
60	D-2	Occupied	Dillon	Jackie Sue Young	9/12/1946	5/9/2019	Dillon		Find a Grave	Section 1
61	D-2	Occupied	Dillon	Jerry Thomas "JD"	2/28/1945	3/21/2011	Dillon	Vet/Army/SPC/Vietnam	Find a Grave	Section 1
62	D-2	Reserved		Debbie			Dillon			Section 1
63	D-2	Reserved					Baker, Trudy			Section 1
64	D-2	Reserved					Baker, Trudy			Section 1
65	E-2	Reserved					Baker, Trudy			Section 1
66	E-2	Reserved					Baker, Trudy			Section 1
67	E-2	Reserved					Baker, Trudy			Section 1
68	E-2	Reserved					Baker, Trudy			Section 1
69	E-2	Reserved					Baker, Trudy			Section 1
70	A-2	Reserved					Roberts, Payne			Section 1
71	A-2	Reserved					Roberts, Payne			Section 1
72	A-2	Reserved					Roberts, Payne			Section 1
73	B-2	Reserved					Roberts, Payne			Section 1
74	B-2	Reserved					Roberts, Payne			Section 1
75	B-2	Reserved					Roberts, Payne			Section 1
76	B-2	Reserved					Roberts, Payne			Section 1
77	B-2	Reserved					Roberts, Payne			Section 1
78	C-2	Available								Section 1
79	C-2	Available								Section 1
80	C-2	Available								Section 1
81	C-2	Available								Section 1
82	C-2	Available								Section 1
83	D-2	Available								Section 1
84	D-2	Reserved					McCuen, Carlton			Section 1
85	D-2	Occupied	McCuen	JoAnn Sims Martin	2/7/1947	2/9/2021	McCuen, JoAnn		Find a Grave	Section 1
86	D-2	Reserved					Simmons, Marie			Section 1
87	D-2	Reserved					Simmons, Marie			Section 1
88	E-2	Reserved					Simmons, Marie			Section 1
89	E-2	Occupied	Simmons	Nancy Morgan	2/2/1957	1/3/2012	Simmons, Marie		Find a Grave	Section 1
90	E-2	Occupied	Simmons	George Herman Jr	8/30/1948	5/13/2010	Simmons, Marie		Find a Grave	Section 1
91	E-2	Occupied	Simmons	Marie Teutsch	8/30/1929	6/22/1994	Simmons, Marie		Find a Grave	Section 1
92	E-2	Reserved	Simmons	Terry Lynn	1/2/1957		Simmons, Marie			Section 1
93	A-3	Reserved					Roberts, Virginia			Section 1
94	A-3	Reserved					Roberts, Virginia			Section 1
95	A-3	Reserved					Roberts, Virginia			Section 1
96	B-3	Reserved					Roberts, Virginia			Section 1
97	B-3	Reserved					Roberts, Virginia			Section 1
98	B-3	Reserved					Roberts, Virginia			Section 1
99	B-3	Reserved					Roberts, Virginia			Section 1
100	B-3	Reserved					Roberts, Virginia			Section 1
101	C-3	Available								Section 1
102	C-3	Available								Section 1
103	C-3	Available								Section 1
104	C-3	Available								Section 1
105	C-3	Available								Section 1
106	D-3	Available								Section 1
107	D-3	Available								Section 1
108	D-3	Available								Section 1
109	D-3	Reserved					Simmons, Marie			Section 1
110	D-3	Reserved					Simmons, Marie			Section 1
111	E-3	Reserved					Simmons, Marie			Section 1
112	E-3	Reserved					Simmons, Marie			Section 1
113	E-3	Reserved					Simmons, Marie			Section 1
114	E-3	Reserved					Simmons, Marie			Section 1
115	E-3	Reserved					Simmons, Marie			Section 1
116	A-3	Available								Section 1
117	A-3	Available								Section 1
118	A-3	Available								Section 1
119	B-3	Available								Section 1
120	B-3	Available								Section 1
121	B-3	Available								Section 1
122	B-3	Occupied	Caraway	David Nichole	2/4/2015	2/4/2015	Caraway		Find a Grave	Section 1
123	B-3	Reserved					Caraway			Section 1
124	C-3	Reserved					Caraway			Section 1
125	C-3	Reserved					Caraway			Section 1
126	C-3	Available								Section 1
127	C-3	Available								Section 1
128	C-3	Available								Section 1
129	D-3	Available								Section 1
130	D-3	Available								Section 1
131	D-3	Available								Section 1
132	D-3	Reserved					Simmons, Marie			Section 1
133	D-3	Reserved					Simmons, Marie			Section 1
134	E-3	Reserved					Simmons, Marie			Section 1
135	E-3	Reserved					Simmons, Marie			Section 1
136	E-3	Reserved					Simmons, Marie			Section 1
137	E-3	Reserved					Simmons, Marie			Section 1
138	E-3	Reserved					Simmons, Marie			Section 1
139	A-4	Reserved	Bauldree				Bauldree			Section 1
140	A-4	Occupied	Bauldree	Ralph Edward	7/13/1958	4/192000	Bauldree		Find a Grave	Section 1
141	A-4	Reserved	Bauldree	Emma L			Bauldree			Section 1
142	B-4	Reserved					Bauldree			Section 1
143	B-4	Reserved					Bauldree			Section 1
144	B-4	Reserved					Bauldree			Section 1
145	B-4	Available								Section 1
146	B-4	Reserved					Pierce			Section 1
147	C-4	Reserved					Pierce			Section 1
148	C-4	Reserved					Pierce			Section 1
149	C-4	Reserved					Matlock			Section 1
150	C-4	Reserved					Matlock			Section 1
151	C-4	Reserved					Matlock			Section 1
152	D-2	Reserved					Matlock			Section 1
153	D-2	Reserved					Matlock			Section 1
154	D-2	Reserved	Matlock	Ronnie			Matlock			Section 1
155	D-2	Occupied	Matlock	Clyde L	9/9/1934	4/19/2001	Matlock		Find a Grave	Section 1
156	D-2	Reserved		Lydia Beth			Matlock			Section 1
157	E-4	Occupied	Peirce	James Durwood "Dub"	9/14/1940	2/23/2015	Pierce		Find a Grave	Section 1
158	E-4	Reserved					Pierce			Section 1
159	E-4	Reserved					Pierce			Section 1
160	E-4	Reserved					Pierce			Section 1
161	E-4	Reserved					Pierce			Section 1
162	A-4	Reserved					Miller			Section 1
163	A-4	Occupied	Miller	Leonard F	6/15/1906	3/13/1990	Miller		Find a Grave	Section 1
164	A-4	Occupied	Miller	Nevella J	11/14/1913	2/18/1981	Miller		Find a Grave	Section 1
165	B-4	Reserved					Miller			Section 1
166	B-4	Reserved					Miller			Section 1
167	B-4	Occupied	Adkins	Lyndell W	1/29/1933	10/8/1996	Adkins	Vet/Army	Find a Grave	Section 1
168	B-4	Occupied	Johnson	Roy Woodard Sr	7/23/1917	1/18/1980	Johnson	Vet/Army/T4/WWII	Find a Grave	Section 1
169	B-4	Occupied	Johnson	Ollie Mae Palmer	6/23/1925	2/14/1982	Johnson		Find a Grave	Section 1
170	C-4	Occupied	Johnson	Roy W Jr	5/28/1949	4/1/2011	Johnson			Section 1
171	C-4	Reserved					Johnson			Section 1
172	C-4	Reserved					Johnson			Section 1
173	C-4	Occupied	Johnson	Eldon Hollis	4/22/1921	9/23/1999	Johnson	Vet/Army/PFC/WWII	Find a Grave	Section 1
174	C-4	Reserved					Johnson			Section 1
175	D-4	Reserved					Johnson			Section 1
176	D-4	Reserved					Johnson			Section 1
177	D-4	Reserved					Johnson			Section 1
178	D-4	Reserved					Johnson			Section 1
179	D-4	Reserved					Johnson			Section 1
180	E-4	Reserved					Johnson			Section 1
181	E-4	Reserved					Johnson			Section 1
182	E-4	Reserved					Johnson			Section 1
183	E-4	Occupied	Bradford	Rodger L	1/14/1953	11/25/2021	Johnson	Vet/Army/PFC/Vietnam	Find a Grave	Section 1
184	E-4	Occupied	Niler	Christine Johnson	10/27/1922	1/9/1996	Adkins		Find a Grave	Section 1`;

        // Split by new line
        const lines = rawData.split('\n');
        
        // Parse records
        const records = lines
            .filter(line => line.trim().length > 0)
            .map(line => {
                // Split by tabs
                const parts = line.split('\t');
                
                // If tabs didn't work (length 1), try to guess if it's spaces (not ideal but fallback)
                // But we expect tabs from the source.
                
                return {
                    grave: parts[0]?.trim(),
                    row: parts[1]?.trim(),
                    status: parts[2]?.trim(),
                    last_name: parts[3]?.trim(),
                    first_name: parts[4]?.trim(),
                    birth: parts[5]?.trim(),
                    death: parts[6]?.trim(),
                    family_name: parts[7]?.trim(),
                    notes: parts[8]?.trim(),
                    find_a_grave: parts[9]?.trim(),
                    section: parts[10]?.trim(),
                    sort_order: parseInt(parts[0]?.trim()) || 0
                };
            })
            .filter(r => r.grave); // Ensure valid record

        // Bulk insert in chunks
        const chunkSize = 50;
        let insertedCount = 0;
        
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            if (chunk.length > 0) {
                await base44.entities.PlotsAndMaps.bulkCreate(chunk);
                insertedCount += chunk.length;
            }
        }

        return Response.json({ 
            success: true, 
            count: insertedCount,
            message: `Successfully seeded ${insertedCount} records`
        });
    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});