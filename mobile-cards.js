/*
 * SAS(S) Exam Portal — mobile card display add-on
 *
 * This file does not change CSV parsing, paper matching, teacher matching,
 * duty construction, Full Master View sorting, or any other data logic.
 *
 * Install:
 * 1. Put mobile-cards.js beside index.html in the GitHub repository.
 * 2. Add this ONE line immediately before </body> in index.html:
 *
 *    <script src="mobile-cards.js"></script>
 */

(function(){
    "use strict";

    if(
        typeof displayTeacherSchedule!=="function" ||
        typeof displayExamSchedule!=="function" ||
        typeof displayMasterView!=="function" ||
        typeof clearTable!=="function" ||
        typeof dutyStageHTML!=="function"
    ){
        console.error(
            "mobile-cards.js must be loaded after the existing exam portal script."
        );
        return;
    }

    /* =======================================================
       MOBILE-ONLY STYLES
       Desktop tables and existing styles remain unchanged.
    ======================================================= */

    const style=document.createElement("style");

    style.textContent=`
        #mobileCards{
            display:none;
        }

        .mobile-record-card{
            overflow:hidden;
            margin:0 0 14px;
            background:#fff;
            border:1px solid #000;
            border-radius:10px;
            box-shadow:0 3px 10px rgba(0,0,0,.16);
        }

        .mobile-record-heading{
            padding:9px 12px;
            background:#004085;
            color:#fff;
            font-size:14px;
            font-weight:bold;
            text-align:center;
        }

        .mobile-field{
            display:grid;
            grid-template-columns:minmax(105px,35%) minmax(0,1fr);
            border-bottom:1px solid #000;
        }

        .mobile-field:last-child{
            border-bottom:0;
        }

        .mobile-label,
        .mobile-value{
            padding:9px 10px;
            font-size:13px;
            line-height:1.4;
        }

        .mobile-label{
            display:flex;
            align-items:flex-start;
            background:#eef3f8;
            color:#004085;
            border-right:1px solid #000;
            font-weight:bold;
        }

        .mobile-value{
            min-width:0;
            background:#fff;
            color:#333;
            white-space:normal;
            overflow-wrap:anywhere;
            word-break:normal;
        }

        .mobile-empty{
            padding:18px;
            background:#fff;
            border:1px solid #000;
            border-radius:10px;
            text-align:center;
        }

        #warningBox{
            margin-top:20px;
            margin-bottom:0;
        }

        @media(max-width:768px){
            #tableWrapper{
                display:none;
            }

            #mobileCards{
                display:block;
                margin-bottom:20px;
            }
        }

        @media print{
            #mobileCards,
            .warning{
                display:none!important;
            }

            #tableWrapper{
                display:block!important;
            }
        }
    `;

    document.head.appendChild(style);

    /* =======================================================
       CREATE MOBILE CONTAINER AND MOVE WARNING TO THE BOTTOM
    ======================================================= */

    const tableWrapper=document.getElementById("tableWrapper");
    const mobileCards=document.createElement("div");

    mobileCards.id="mobileCards";
    mobileCards.setAttribute("aria-live","polite");

    if(tableWrapper){
        tableWrapper.insertAdjacentElement("afterend",mobileCards);
    }

    const warningBox=document.getElementById("warningBox");
    const pageContainer=document.querySelector(".container");

    if(warningBox && pageContainer){
        pageContainer.appendChild(warningBox);
    }

    /* =======================================================
       REQUIRED DUTY WORDING
    ======================================================= */

    function dutyText(duty){
        if(duty.isStart && duty.isEnd){
            return "Start & End Paper";
        }

        if(duty.isStart){
            return "Start Paper";
        }

        if(duty.isEnd){
            return "End Paper";
        }

        return "Invigilation";
    }

    dutyStageHTML=function(duty){
        if(duty.isStart && duty.isEnd){
            return '<span class="duty-stage start-end">Start &amp; End Paper</span>';
        }

        if(duty.isStart){
            return '<span class="duty-stage start">Start Paper</span>';
        }

        if(duty.isEnd){
            return '<span class="duty-stage end">End Paper</span>';
        }

        return '<span class="duty-stage middle">Invigilation</span>';
    };

    function renameDutyHeader(){
        document.querySelectorAll("#tableHead th").forEach(header=>{
            if(header.textContent.trim()==="Duty Stage"){
                header.textContent="Duty";
            }
        });
    }

    /* =======================================================
       CARD HTML HELPERS
    ======================================================= */

    function fieldHTML(label,value,rawHTML=false){
        return `
            <div class="mobile-field">
                <div class="mobile-label">${escapeHTML(label)}</div>
                <div class="mobile-value">
                    ${rawHTML ? value : escapeHTML(value)}
                </div>
            </div>
        `;
    }

    function dutyCardHTML(duty,teacherName){
        const teacher=duty.teacher || teacherName || "";

        return `
            <article class="mobile-record-card">
                ${fieldHTML("Teacher",teacher)}
                ${fieldHTML(
                    "Time",
                    formatTimeRange(duty.start,duty.end)
                )}
                ${fieldHTML(
                    "Duty",
                    dutyStageHTML(duty),
                    true
                )}
                ${fieldHTML(
                    "Subject Paper",
                    duty.subject
                )}
                ${fieldHTML(
                    "Venue / Class",
                    duty.venue
                )}
                ${fieldHTML(
                    "Next Invigilator",
                    duty.nextInvigilator
                )}
            </article>
        `;
    }

    function examCardHTML(sectionTitle,record){
        let fields=fieldHTML("Session",sectionTitle);

        examHeader.forEach(header=>{
            const value=record[header] || "";

            if(value!==""){
                fields+=fieldHTML(header,value);
            }
        });

        return `
            <article class="mobile-record-card">
                ${fields}
            </article>
        `;
    }

    function showEmptyMobileMessage(message){
        mobileCards.innerHTML=`
            <div class="mobile-empty">
                ${escapeHTML(message)}
            </div>
        `;
    }

    /* =======================================================
       CLEAR BOTH DESKTOP AND MOBILE RESULTS
    ======================================================= */

    const originalClearTable=clearTable;

    clearTable=function(){
        originalClearTable();
        mobileCards.innerHTML="";
    };

    /* =======================================================
       FIND MY DUTIES — ONE DUTY PER CARD
       Teacher name is repeated on every card.
    ======================================================= */

    const originalDisplayTeacherSchedule=displayTeacherSchedule;

    displayTeacherSchedule=function(name){
        originalDisplayTeacherSchedule(name);
        renameDutyHeader();

        const duties=teacherSchedules[name] || [];

        if(!duties.length){
            showEmptyMobileMessage(
                "No invigilation duties found."
            );
            return;
        }

        mobileCards.innerHTML=duties
            .map(duty=>dutyCardHTML(duty,name))
            .join("");
    };

    /* =======================================================
       EXAM SCHEDULE — ONE PAPER PER CARD
       Every non-empty field is transposed to its own row.
    ======================================================= */

    const originalDisplayExamSchedule=displayExamSchedule;

    displayExamSchedule=function(){
        originalDisplayExamSchedule();

        if(!examSections.length){
            showEmptyMobileMessage(
                "No examination schedule found."
            );
            return;
        }

        const cards=[];

        examSections.forEach(section=>{
            section.rows.forEach(record=>{
                cards.push(
                    examCardHTML(
                        section.title,
                        record
                    )
                );
            });
        });

        mobileCards.innerHTML=cards.length
            ? cards.join("")
            : `
                <div class="mobile-empty">
                    No examination schedule found.
                </div>
            `;
    };

    /* =======================================================
       FULL MASTER VIEW — EXISTING DATA AND SORT ORDER RETAINED
       One duty per card; teacher is repeated on every card.
    ======================================================= */

    const originalDisplayMasterView=displayMasterView;

    displayMasterView=function(){
        originalDisplayMasterView();
        renameDutyHeader();

        const duties=[];

        teacherNames.forEach(name=>{
            (teacherSchedules[name] || [])
                .forEach(duty=>{
                    duties.push(duty);
                });
        });

        duties.sort((a,b)=>
            a.startMinutes-b.startMinutes ||
            a.venue.localeCompare(b.venue) ||
            a.teacher.localeCompare(b.teacher)
        );

        if(!duties.length){
            showEmptyMobileMessage(
                "No invigilation duties found."
            );
            return;
        }

        mobileCards.innerHTML=duties
            .map(duty=>
                dutyCardHTML(
                    duty,
                    duty.teacher
                )
            )
            .join("");
    };
})();
