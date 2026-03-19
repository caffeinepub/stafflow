import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Char "mo:core/Char";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Random "mo:core/Random";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  public type Company = {
    id : Text;
    name : Text;
    entryCode : Text;
    createdAt : Int;
  };

  public type Personnel = {
    id : Text;
    name : Text;
    companyId : Text;
    entryCode : Text;
    isAdmin : Bool;
    department : Text;
    isActive : Bool;
    shiftId : ?Text;
  };

  public type AttendanceRecord = {
    id : Text;
    personnelId : Text;
    companyId : Text;
    checkIn : Int;
    checkOut : Int;
    hasCheckedOut : Bool;
  };

  public type DepartmentSummary = {
    department : Text;
    personnel : [Personnel];
  };

  public type UserProfile = {
    name : Text;
    personnelId : ?Text;
    companyId : ?Text;
  };

  public type Shift = {
    id : Text;
    companyId : Text;
    name : Text;
    startTime : Text;
    endTime : Text;
    workDays : Text;
  };

  public type LeaveType = {
    id : Text;
    companyId : Text;
    name : Text;
    annualQuota : Nat;
  };

  public type LeaveRequest = {
    id : Text;
    personnelId : Text;
    companyId : Text;
    leaveTypeId : Text;
    startDate : Text;
    endDate : Text;
    days : Nat;
    reason : Text;
    status : Text;
    reviewerNote : ?Text;
  };

  public type AttendanceCorrectionRequest = {
    id : Text;
    personnelId : Text;
    companyId : Text;
    date : Text;
    requestedCheckIn : Int;
    requestedCheckOut : Int;
    status : Text;
    reviewerNote : ?Text;
  };

  public type LeaveBalance = {
    personnelId : Text;
    leaveTypeId : Text;
    usedDays : Nat;
  };

  public type BreakRecord = {
    id : Text;
    attendanceId : Text;
    personnelId : Text;
    startTime : Int;
    endTime : ?Int;
    isActive : Bool;
  };

  public type Announcement = {
    id : Text;
    companyId : Text;
    title : Text;
    content : Text;
    authorId : Text;
    createdAt : Int;
    isActive : Bool;
  };

  public type Notification = {
    id : Text;
    personnelId : Text;
    companyId : Text;
    notifType : Text;
    message : Text;
    isRead : Bool;
    createdAt : Int;
  };

  public type AuditLog = {
    id : Text;
    companyId : Text;
    actorId : Text;
    actionType : Text;
    targetId : Text;
    details : Text;
    timestamp : Int;
  };

  public type PayrollEntry = {
    personnelId : Text;
    name : Text;
    department : Text;
    totalWorkMinutes : Int;
    absenceDays : Nat;
    leaveDays : Nat;
    lateCount : Nat;
    month : Nat;
    year : Nat;
  };

  let companies = Map.empty<Text, Company>();
  let personnel = Map.empty<Text, Personnel>();
  let attendanceRecords = Map.empty<Text, AttendanceRecord>();
  let shifts = Map.empty<Text, Shift>();
  let leaveTypes = Map.empty<Text, LeaveType>();
  let leaveRequests = Map.empty<Text, LeaveRequest>();
  let attendanceCorrectionRequests = Map.empty<Text, AttendanceCorrectionRequest>();
  let leaveBalances = Map.empty<Text, LeaveBalance>();
  let breakRecords = Map.empty<Text, BreakRecord>();
  let announcements = Map.empty<Text, Announcement>();
  let notifications = Map.empty<Text, Notification>();
  let auditLogs = Map.empty<Text, AuditLog>();

  var nextCompanyId = 1;
  var nextPersonnelId = 1;
  var nextAttendanceRecordId = 1;
  var nextShiftId = 1;
  var nextLeaveTypeId = 1;
  var nextLeaveRequestId = 1;
  var nextAttendanceCorrectionRequestId = 1;
  var nextBreakRecordId = 1;
  var nextAnnouncementId = 1;
  var nextNotificationId = 1;
  var nextAuditLogId = 1;

  let accessControlState = AccessControl.initState();

  let userProfiles = Map.empty<Principal, UserProfile>();
  let principalToPersonnel = Map.empty<Principal, Text>();
  let principalToCompany = Map.empty<Principal, Text>();

  include MixinAuthorization(accessControlState);

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user: Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  func generateEntryCodeInternal(seed : ?Nat) : Text {
    let chars : [Char] = "abcdefghijklmnopqrstuvwxyz1234567890".toArray();
    let arrayText = Array.tabulate(
      6,
      func(i) {
        let seedValue = switch (seed) {
          case (null) { 0 };
          case (?value) { value };
        };
        let index = ((i + seedValue) % 36) : Nat;
        chars[index];
      },
    );
    let text : Text = arrayText.toText();
    text;
  };

  func generateEntryCode() : async Text {
    let rnd = Random.crypto();
    let number = await* rnd.natRange(0, 99_999);
    if (number > 36) { return generateEntryCodeInternal(?number); };

    generateEntryCodeInternal(null);
  };

  func getCurrentTime() : Int {
    Time.now();
  };

  func getPersonnelByCompany(companyId : Text) : [Personnel] {
    let iter = personnel.values();
    let result = personnel.values().toArray().filter(
      func(p) {
        return p.companyId == companyId;
      }
    );
    result;
  };

  func isCompanyAdmin(caller: Principal, companyId: Text) : Bool {
    switch (principalToPersonnel.get(caller)) {
      case (null) { false };
      case (?personnelId) {
        switch (personnel.get(personnelId)) {
          case (null) { false };
          case (?person) {
            person.companyId == companyId and person.isAdmin and person.isActive;
          };
        };
      };
    };
  };

  func getCallerPersonnelId(caller: Principal) : ?Text {
    principalToPersonnel.get(caller);
  };

  func isPersonnelInCompany(personnelId: Text, companyId: Text) : Bool {
    switch (personnel.get(personnelId)) {
      case (null) { false };
      case (?person) { person.companyId == companyId };
    };
  };

  func createNotification(personnelId: Text, companyId: Text, notifType: Text, message: Text) {
    let id = nextNotificationId.toText();
    let notification : Notification = {
      id;
      personnelId;
      companyId;
      notifType;
      message;
      isRead = false;
      createdAt = getCurrentTime();
    };
    notifications.add(id, notification);
    nextNotificationId += 1;
  };

  func logAuditAction(companyId: Text, actorId: Text, actionType: Text, targetId: Text, details: Text) {
    let id = nextAuditLogId.toText();
    let log : AuditLog = {
      id;
      companyId;
      actorId;
      actionType;
      targetId;
      details;
      timestamp = getCurrentTime();
    };
    auditLogs.add(id, log);
    nextAuditLogId += 1;
  };

  public shared ({ caller }) func registerCompany(name : Text) : async Company {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register companies");
    };
    let id = nextCompanyId.toText();
    let entryCode = await generateEntryCode();
    let company : Company = {
      id;
      name;
      entryCode;
      createdAt = getCurrentTime();
    };
    companies.add(id, company);
    principalToCompany.add(caller, id);
    nextCompanyId += 1;
    company;
  };

  public shared ({ caller }) func loginCompany(entryCode : Text) : async ?Company {
    let iter = companies.values();
    let company = companies.values().toArray().filter(
      func (c) {
        return c.entryCode == entryCode;
      }
    );
    if (company.isEmpty()) { return null };
    principalToCompany.add(caller, company[0].id);
    ?company[0];
  };

  public shared ({ caller }) func addPersonnel(companyId : Text, name : Text, department : Text, isAdmin : Bool) : async Personnel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add personnel");
    };
    if (not companies.containsKey(companyId)) {
      Runtime.trap("Company not found");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can add personnel");
    };
    let id = nextPersonnelId.toText();
    let entryCode = await generateEntryCode();
    let person : Personnel = {
      id;
      name;
      companyId;
      entryCode;
      isAdmin;
      department;
      isActive = true;
      shiftId = null;
    };
    personnel.add(id, person);
    nextPersonnelId += 1;
    
    switch (getCallerPersonnelId(caller)) {
      case (?actorPersonnelId) {
        logAuditAction(companyId, actorPersonnelId, "add_personnel", id, "Added personnel: " # name);
      };
      case (null) {};
    };
    
    person;
  };

  public query func loginPersonnel(entryCode : Text) : async ?Personnel {
    let iter = personnel.values();
    let person = personnel.values().toArray().filter(
      func (p) {
        return p.entryCode == entryCode;
      }
    );
    switch (person.values().next()) {
      case (null) { null };
      case (?person) {
        if (person.isActive) {
          ?person;
        } else {
          null;
        };
      };
    };
  };

  public shared ({ caller }) func linkPersonnelToPrincipal(entryCode : Text) : async ?Personnel {
    let iter = personnel.values();
    let person = personnel.values().toArray().filter(
      func (p) {
        return p.entryCode == entryCode;
      }
    );
    switch (person.values().next()) {
      case (null) { null };
      case (?person) {
        if (person.isActive) {
          principalToPersonnel.add(caller, person.id);
          ?person;
        } else {
          null;
        };
      };
    };
  };

  public shared ({ caller }) func checkIn(personnelId : Text, companyId : Text) : async ?AttendanceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check in");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only check in for yourself");
        };
      };
    };
    if (not companies.containsKey(companyId)) {
      Runtime.trap("Company not found");
    };
    switch (personnel.get(personnelId)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        if (not person.isActive) {
          Runtime.trap("Personnel is not active");
        };
        if (person.companyId != companyId) {
          Runtime.trap("Personnel does not belong to this company");
        };
      };
    };
    let id = nextAttendanceRecordId.toText();
    let record : AttendanceRecord = {
      id;
      personnelId;
      companyId;
      checkIn = getCurrentTime();
      checkOut = 0;
      hasCheckedOut = false;
    };
    attendanceRecords.add(id, record);
    nextAttendanceRecordId += 1;
    
    logAuditAction(companyId, personnelId, "check_in", id, "Check-in recorded");
    
    ?record;
  };

  public shared ({ caller }) func checkOut(personnelId : Text) : async ?AttendanceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check out");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only check out for yourself");
              };
            };
          };
        };
      };
    };
    let iter = attendanceRecords.values();
    let activeRecord = attendanceRecords.values().toArray().filter(
      func (record) {
        return record.personnelId == personnelId and not record.hasCheckedOut;
      }
    );
    if (activeRecord.isEmpty()) {
      Runtime.trap("No active check-in found");
    };
    let record = activeRecord[0];
    let updatedRecord : AttendanceRecord = {
      record with
      checkOut = getCurrentTime();
      hasCheckedOut = true;
    };
    attendanceRecords.add(record.id, updatedRecord);
    
    logAuditAction(record.companyId, personnelId, "check_out", record.id, "Check-out recorded");
    
    ?updatedRecord;
  };

  public query ({ caller }) func getPersonnelList(companyId : Text) : async [Personnel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view personnel list");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      switch (getCallerPersonnelId(caller)) {
        case (null) { Runtime.trap("Unauthorized: Only company members can view personnel list"); };
        case (?personnelId) {
          if (not isPersonnelInCompany(personnelId, companyId)) {
            Runtime.trap("Unauthorized: Only company members can view personnel list");
          };
        };
      };
    };
    getPersonnelByCompany(companyId);
  };

  public query ({ caller }) func getAttendanceByCompany(companyId : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view company attendance");
    };
    let iter = attendanceRecords.values();
    attendanceRecords.values().toArray().filter(func (record) {
      return record.companyId == companyId;
    });
  };

  public query ({ caller }) func getAttendanceByPersonnel(personnelId : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own attendance");
              };
            };
          };
        };
      };
    };
    let iter = attendanceRecords.values();
    attendanceRecords.values().toArray().filter(func (record) {
      return record.personnelId == personnelId;
    });
  };

  public query ({ caller }) func getActiveCheckIn(personnelId : Text) : async ?AttendanceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active check-in");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own active check-in");
              };
            };
          };
        };
      };
    };
    let iter = attendanceRecords.values();
    let filteredIter = attendanceRecords.values().toArray().filter(
      func(record){
      record.personnelId == personnelId and not record.hasCheckedOut
      }
    );
    switch (filteredIter.values().next()) {
      case (null) { null };
      case (?record) { ?record };
    };
  };

  public shared ({ caller }) func updatePersonnel(id : Text, name : Text, department : Text, isActive : Bool) : async ?Personnel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update personnel");
    };
    switch (personnel.get(id)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        if (not isCompanyAdmin(caller, person.companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only company admins can update personnel");
        };
        let updatedPerson : Personnel = {
          person with
          name;
          department;
          isActive;
        };
        personnel.add(id, updatedPerson);
        
        switch (getCallerPersonnelId(caller)) {
          case (?actorPersonnelId) {
            logAuditAction(person.companyId, actorPersonnelId, "update_personnel", id, "Updated personnel: " # name);
          };
          case (null) {};
        };
        
        ?updatedPerson;
      };
    };
  };

  public query ({ caller }) func getPersonById(personId : Text) : async Personnel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view personnel");
    };
    switch (personnel.get(personId)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        switch (getCallerPersonnelId(caller)) {
          case (null) {
            if (not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Personnel not linked to caller");
            };
          };
          case (?callerPersonnelId) {
            if (callerPersonnelId != personId and not isCompanyAdmin(caller, person.companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
              if (not isPersonnelInCompany(callerPersonnelId, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view personnel in your company");
              };
            };
          };
        };
        return person;
      };
    };
  };

  public query ({ caller }) func getCompanyById(companyId : Text) : async Company {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view companies");
    };
    switch (companies.get(companyId)) {
      case (null) {
        Runtime.trap("Company not found");
      };
      case (?company) {
        switch (getCallerPersonnelId(caller)) {
          case (null) {
            if (not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Personnel not linked to caller");
            };
          };
          case (?personnelId) {
            if (not isPersonnelInCompany(personnelId, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Can only view your own company");
            };
          };
        };
        return company;
      };
    };
  };

  public query ({ caller }) func getPersonAttendanceByDate(personId : Text, dateStart : Int, dateEnd : Int) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own attendance");
              };
            };
          };
        };
      };
    };
    attendanceRecords.values().toArray().filter(func (record) {
      return record.personnelId == personId and record.checkIn >= dateStart and record.checkIn <= dateEnd;
    });
  };

  public query ({ caller }) func getDepartmentSummaries(companyId : Text) : async [DepartmentSummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view department summaries");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view department summaries");
    };
    let personnel = getPersonnelByCompany(companyId);
    let departments = personnel.map(
      func (person) { person.department }
    );
    departments.map(
      func (dept) {
        let deptPersonnel = personnel.filter(
          func (person) {
            person.department == dept;
          }
        );
        {
          department = dept;
          personnel = deptPersonnel;
        };
      }
    );
  };

  public shared ({ caller }) func createShift(companyId : Text, name : Text, startTime : Text, endTime : Text, workDays : Text) : async Shift {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create shifts");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can create shifts");
    };
    let id = nextShiftId.toText();
    let shift : Shift = {
      id;
      companyId;
      name;
      startTime;
      endTime;
      workDays;
    };
    shifts.add(id, shift);
    nextShiftId += 1;
    
    switch (getCallerPersonnelId(caller)) {
      case (?actorPersonnelId) {
        logAuditAction(companyId, actorPersonnelId, "create_shift", id, "Created shift: " # name);
      };
      case (null) {};
    };
    
    shift;
  };

  public shared ({ caller }) func assignShift(personnelId : Text, shiftId : Text) : async Personnel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can assign shifts");
    };
    switch (personnel.get(personnelId)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        if (not isCompanyAdmin(caller, person.companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only company admins can assign shifts");
        };
        let updatedPerson : Personnel = {
          person with
          shiftId = ?shiftId;
        };
        personnel.add(personnelId, updatedPerson);
        
        switch (getCallerPersonnelId(caller)) {
          case (?actorPersonnelId) {
            logAuditAction(person.companyId, actorPersonnelId, "assign_shift", personnelId, "Assigned shift: " # shiftId);
          };
          case (null) {};
        };
        
        updatedPerson;
      };
    };
  };

  public query ({ caller }) func getShiftsByCompany(companyId : Text) : async [Shift] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view shifts");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      switch (getCallerPersonnelId(caller)) {
        case (null) { Runtime.trap("Unauthorized: Only company members can view shifts"); };
        case (?personnelId) {
          if (not isPersonnelInCompany(personnelId, companyId)) {
            Runtime.trap("Unauthorized: Only company members can view shifts");
          };
        };
      };
    };
    let iter = shifts.values();
    shifts.values().toArray().filter(
      func (shift) {
        shift.companyId == companyId;
      }
    );
  };

  public shared ({ caller }) func createLeaveType(companyId : Text, name : Text, annualQuota : Nat) : async LeaveType {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create leave types");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can create leave types");
    };
    let id = nextLeaveTypeId.toText();
    let leaveType : LeaveType = {
      id;
      companyId;
      name;
      annualQuota;
    };
    leaveTypes.add(id, leaveType);
    nextLeaveTypeId += 1;
    
    switch (getCallerPersonnelId(caller)) {
      case (?actorPersonnelId) {
        logAuditAction(companyId, actorPersonnelId, "create_leave_type", id, "Created leave type: " # name);
      };
      case (null) {};
    };
    
    leaveType;
  };

  public shared ({ caller }) func createDefaultLeaveTypes(companyId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create default leave types");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can create default leave types");
    };
    ignore await createLeaveType(companyId, "Annual Leave", 15);
    ignore await createLeaveType(companyId, "Sick Leave", 10);
    ignore await createLeaveType(companyId, "Unpaid Leave", 0);
  };

  public query ({ caller }) func getLeaveTypesByCompany(companyId : Text) : async [LeaveType] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leave types");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      switch (getCallerPersonnelId(caller)) {
        case (null) { Runtime.trap("Unauthorized: Only company members can view leave types"); };
        case (?personnelId) {
          if (not isPersonnelInCompany(personnelId, companyId)) {
            Runtime.trap("Unauthorized: Only company members can view leave types");
          };
        };
      };
    };
    let iter = leaveTypes.values();
    leaveTypes.values().toArray().filter(
      func (leaveType) {
        leaveType.companyId == companyId;
      }
    );
  };

  public shared ({ caller }) func submitLeaveRequest(personnelId : Text, leaveTypeId : Text, startDate : Text, endDate : Text, days : Nat, reason : Text) : async LeaveRequest {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit leave requests");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only submit leave requests for yourself");
        };
      };
    };
    switch (personnel.get(personnelId)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        let id = nextLeaveRequestId.toText();
        let leaveRequest : LeaveRequest = {
          id;
          personnelId;
          companyId = person.companyId;
          leaveTypeId;
          startDate;
          endDate;
          days;
          reason;
          status = "pending";
          reviewerNote = null;
        };
        leaveRequests.add(id, leaveRequest);
        nextLeaveRequestId += 1;
        
        logAuditAction(person.companyId, personnelId, "submit_leave_request", id, "Submitted leave request");
        
        leaveRequest;
      };
    };
  };

  public shared ({ caller }) func reviewLeaveRequest(companyId : Text, requestId : Text, status : Text, reviewerNote : ?Text) : async LeaveRequest {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can review leave requests");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can review leave requests");
    };
    switch (leaveRequests.get(requestId)) {
      case (null) {
        Runtime.trap("Leave request not found");
      };
      case (?request) {
        if (request.companyId != companyId) {
          Runtime.trap("Leave request does not belong to this company");
        };
        let updatedRequest : LeaveRequest = {
          request with
          status;
          reviewerNote;
        };
        leaveRequests.add(requestId, updatedRequest);
        if (status == "approved") {
          let balanceKey = request.personnelId # "-" # request.leaveTypeId;
          switch (leaveBalances.get(balanceKey)) {
            case (null) {
              let newBalance : LeaveBalance = {
                personnelId = request.personnelId;
                leaveTypeId = request.leaveTypeId;
                usedDays = request.days;
              };
              leaveBalances.add(balanceKey, newBalance);
            };
            case (?balance) {
              let updatedBalance : LeaveBalance = {
                balance with
                usedDays = balance.usedDays + request.days;
              };
              leaveBalances.add(balanceKey, updatedBalance);
            };
          };
        };
        
        let notifType = if (status == "approved") { "leave_approved" } else { "leave_rejected" };
        let message = "Your leave request has been " # status;
        createNotification(request.personnelId, companyId, notifType, message);
        
        switch (getCallerPersonnelId(caller)) {
          case (?actorPersonnelId) {
            logAuditAction(companyId, actorPersonnelId, "review_leave_request", requestId, "Reviewed leave request: " # status);
          };
          case (null) {};
        };
        
        updatedRequest;
      };
    };
  };

  public query ({ caller }) func getLeaveRequestsByPersonnel(personnelId : Text) : async [LeaveRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leave requests");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own leave requests");
              };
            };
          };
        };
      };
    };
    leaveRequests.values().toArray().filter(
      func (request) {
        request.personnelId == personnelId;
      }
    );
  };

  public query ({ caller }) func getLeaveRequestsByCompany(companyId : Text) : async [LeaveRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leave requests");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view company leave requests");
    };
    leaveRequests.values().toArray().filter(
      func (request) {
        request.companyId == companyId;
      }
    );
  };

  public shared ({ caller }) func submitAttendanceCorrection(personnelId : Text, companyId : Text, date : Text, requestedCheckIn : Int, requestedCheckOut : Int) : async AttendanceCorrectionRequest {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit attendance corrections");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only submit attendance corrections for yourself");
        };
      };
    };
    switch (personnel.get(personnelId)) {
      case (null) {
        Runtime.trap("Personnel not found");
      };
      case (?person) {
        if (person.companyId != companyId) {
          Runtime.trap("Personnel does not belong to this company");
        };
      };
    };
    let id = nextAttendanceCorrectionRequestId.toText();
    let correctionRequest : AttendanceCorrectionRequest = {
      id;
      personnelId;
      companyId;
      date;
      requestedCheckIn;
      requestedCheckOut;
      status = "pending";
      reviewerNote = null;
    };
    attendanceCorrectionRequests.add(id, correctionRequest);
    nextAttendanceCorrectionRequestId += 1;
    
    logAuditAction(companyId, personnelId, "submit_correction", id, "Submitted attendance correction");
    
    correctionRequest;
  };

  public shared ({ caller }) func reviewAttendanceCorrection(companyId : Text, requestId : Text, status : Text, reviewerNote : ?Text) : async AttendanceCorrectionRequest {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can review attendance corrections");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can review attendance corrections");
    };
    switch (attendanceCorrectionRequests.get(requestId)) {
      case (null) {
        Runtime.trap("Attendance correction request not found");
      };
      case (?request) {
        if (request.companyId != companyId) {
          Runtime.trap("Attendance correction request does not belong to this company");
        };
        let updatedRequest : AttendanceCorrectionRequest = {
          request with
          status;
          reviewerNote;
        };
        attendanceCorrectionRequests.add(requestId, updatedRequest);
        if (status == "approved") {
          let recordId = nextAttendanceRecordId.toText();
          let newRecord : AttendanceRecord = {
            id = recordId;
            personnelId = request.personnelId;
            companyId = request.companyId;
            checkIn = request.requestedCheckIn;
            checkOut = request.requestedCheckOut;
            hasCheckedOut = true;
          };
          attendanceRecords.add(recordId, newRecord);
          nextAttendanceRecordId += 1;
        };
        
        let notifType = if (status == "approved") { "correction_approved" } else { "correction_rejected" };
        let message = "Your attendance correction has been " # status;
        createNotification(request.personnelId, companyId, notifType, message);
        
        switch (getCallerPersonnelId(caller)) {
          case (?actorPersonnelId) {
            logAuditAction(companyId, actorPersonnelId, "review_correction", requestId, "Reviewed correction: " # status);
          };
          case (null) {};
        };
        
        updatedRequest;
      };
    };
  };

  public query ({ caller }) func getAttendanceCorrectionsByPersonnel(personnelId : Text) : async [AttendanceCorrectionRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance corrections");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own attendance corrections");
              };
            };
          };
        };
      };
    };
    attendanceCorrectionRequests.values().toArray().filter(
      func (request) {
        request.personnelId == personnelId;
      }
    );
  };

  public query ({ caller }) func getAttendanceCorrectionsByCompany(companyId : Text) : async [AttendanceCorrectionRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance corrections");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view company attendance corrections");
    };
    attendanceCorrectionRequests.values().toArray().filter(
      func (request) {
        request.companyId == companyId;
      }
    );
  };

  public query ({ caller }) func getLeaveBalance(personnelId : Text, leaveTypeId : Text) : async ?LeaveBalance {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leave balance");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own leave balance");
              };
            };
          };
        };
      };
    };
    let balanceKey = personnelId # "-" # leaveTypeId;
    leaveBalances.get(balanceKey);
  };

  public shared ({ caller }) func startBreak(personnelId : Text, companyId : Text) : async BreakRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start breaks");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only start breaks for yourself");
        };
      };
    };
    
    let activeAttendance = attendanceRecords.values().toArray().filter(
      func (record) {
        record.personnelId == personnelId and not record.hasCheckedOut;
      }
    );
    if (activeAttendance.isEmpty()) {
      Runtime.trap("No active check-in found");
    };
    
    let id = nextBreakRecordId.toText();
    let breakRecord : BreakRecord = {
      id;
      attendanceId = activeAttendance[0].id;
      personnelId;
      startTime = getCurrentTime();
      endTime = null;
      isActive = true;
    };
    breakRecords.add(id, breakRecord);
    nextBreakRecordId += 1;
    
    logAuditAction(companyId, personnelId, "start_break", id, "Started break");
    
    breakRecord;
  };

  public shared ({ caller }) func endBreak(personnelId : Text) : async ?BreakRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can end breaks");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only end breaks for yourself");
              };
            };
          };
        };
      };
    };
    
    let activeBreaks = breakRecords.values().toArray().filter(
      func (br) {
        br.personnelId == personnelId and br.isActive;
      }
    );
    if (activeBreaks.isEmpty()) {
      Runtime.trap("No active break found");
    };
    
    let breakRecord = activeBreaks[0];
    let updatedBreak : BreakRecord = {
      breakRecord with
      endTime = ?getCurrentTime();
      isActive = false;
    };
    breakRecords.add(breakRecord.id, updatedBreak);
    
    switch (personnel.get(personnelId)) {
      case (?person) {
        logAuditAction(person.companyId, personnelId, "end_break", breakRecord.id, "Ended break");
      };
      case (null) {};
    };
    
    ?updatedBreak;
  };

  public query ({ caller }) func getActiveBreak(personnelId : Text) : async ?BreakRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active breaks");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          switch (personnel.get(personnelId)) {
            case (null) { Runtime.trap("Personnel not found"); };
            case (?person) {
              if (not isCompanyAdmin(caller, person.companyId)) {
                Runtime.trap("Unauthorized: Can only view your own active breaks");
              };
            };
          };
        };
      };
    };
    
    let activeBreaks = breakRecords.values().toArray().filter(
      func (br) {
        br.personnelId == personnelId and br.isActive;
      }
    );
    switch (activeBreaks.values().next()) {
      case (null) { null };
      case (?br) { ?br };
    };
  };

  public shared ({ caller }) func createAnnouncement(companyId : Text, title : Text, content : Text) : async Announcement {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create announcements");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can create announcements");
    };
    
    let authorId = switch (getCallerPersonnelId(caller)) {
      case (?pid) { pid };
      case (null) { "admin" };
    };
    
    let id = nextAnnouncementId.toText();
    let announcement : Announcement = {
      id;
      companyId;
      title;
      content;
      authorId;
      createdAt = getCurrentTime();
      isActive = true;
    };
    announcements.add(id, announcement);
    nextAnnouncementId += 1;
    
    let companyPersonnel = getPersonnelByCompany(companyId);
    for (person in companyPersonnel.vals()) {
      createNotification(person.id, companyId, "announcement", "New announcement: " # title);
    };
    
    logAuditAction(companyId, authorId, "create_announcement", id, "Created announcement: " # title);
    
    announcement;
  };

  public query ({ caller }) func getAnnouncementsByCompany(companyId : Text) : async [Announcement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view announcements");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?personnelId) {
        if (not isPersonnelInCompany(personnelId, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view announcements for your company");
        };
      };
    };
    
    announcements.values().toArray().filter(
      func (ann) {
        ann.companyId == companyId and ann.isActive;
      }
    );
  };

  public shared ({ caller }) func deleteAnnouncement(companyId : Text, announcementId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete announcements");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can delete announcements");
    };
    
    switch (announcements.get(announcementId)) {
      case (null) { false };
      case (?ann) {
        if (ann.companyId != companyId) {
          Runtime.trap("Announcement does not belong to this company");
        };
        let updatedAnn : Announcement = {
          ann with
          isActive = false;
        };
        announcements.add(announcementId, updatedAnn);
        
        let authorId = switch (getCallerPersonnelId(caller)) {
          case (?pid) { pid };
          case (null) { "admin" };
        };
        logAuditAction(companyId, authorId, "delete_announcement", announcementId, "Deleted announcement");
        
        true;
      };
    };
  };

  public query ({ caller }) func getNotificationsByPersonnel(personnelId : Text) : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own notifications");
        };
      };
    };
    
    notifications.values().toArray().filter(
      func (notif) {
        notif.personnelId == personnelId;
      }
    );
  };

  public shared ({ caller }) func markNotificationRead(notificationId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    
    switch (notifications.get(notificationId)) {
      case (null) { false };
      case (?notif) {
        switch (getCallerPersonnelId(caller)) {
          case (null) {
            if (not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Personnel not linked to caller");
            };
          };
          case (?callerPersonnelId) {
            if (callerPersonnelId != notif.personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Can only mark your own notifications as read");
            };
          };
        };
        
        let updatedNotif : Notification = {
          notif with
          isRead = true;
        };
        notifications.add(notificationId, updatedNotif);
        true;
      };
    };
  };

  public query ({ caller }) func getUnreadCount(personnelId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view unread count");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own unread count");
        };
      };
    };
    
    let unread = notifications.values().toArray().filter(
      func (notif) {
        notif.personnelId == personnelId and not notif.isRead;
      }
    );
    unread.size();
  };

  public query ({ caller }) func getAuditLogByCompany(companyId : Text) : async [AuditLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view audit logs");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view audit logs");
    };
    
    auditLogs.values().toArray().filter(
      func (log) {
        log.companyId == companyId;
      }
    );
  };

  public shared func kioskCheckIn(companyId : Text, personnelCode : Text) : async ?AttendanceRecord {
    if (not companies.containsKey(companyId)) {
      return null;
    };
    
    let personnelList = personnel.values().toArray().filter(
      func (p) {
        p.entryCode == personnelCode and p.companyId == companyId and p.isActive;
      }
    );
    
    switch (personnelList.values().next()) {
      case (null) { null };
      case (?person) {
        let id = nextAttendanceRecordId.toText();
        let record : AttendanceRecord = {
          id;
          personnelId = person.id;
          companyId;
          checkIn = getCurrentTime();
          checkOut = 0;
          hasCheckedOut = false;
        };
        attendanceRecords.add(id, record);
        nextAttendanceRecordId += 1;
        
        logAuditAction(companyId, person.id, "kiosk_check_in", id, "Kiosk check-in");
        
        ?record;
      };
    };
  };

  public shared func kioskCheckOut(personnelCode : Text) : async ?AttendanceRecord {
    let personnelList = personnel.values().toArray().filter(
      func (p) {
        p.entryCode == personnelCode and p.isActive;
      }
    );
    
    switch (personnelList.values().next()) {
      case (null) { null };
      case (?person) {
        let activeRecords = attendanceRecords.values().toArray().filter(
          func (record) {
            record.personnelId == person.id and not record.hasCheckedOut;
          }
        );
        
        if (activeRecords.isEmpty()) {
          return null;
        };
        
        let record = activeRecords[0];
        let updatedRecord : AttendanceRecord = {
          record with
          checkOut = getCurrentTime();
          hasCheckedOut = true;
        };
        attendanceRecords.add(record.id, updatedRecord);
        
        logAuditAction(record.companyId, person.id, "kiosk_check_out", record.id, "Kiosk check-out");
        
        ?updatedRecord;
      };
    };
  };

  public query ({ caller }) func getAttendanceScore(personnelId : Text, companyId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attendance scores");
    };
    switch (getCallerPersonnelId(caller)) {
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Personnel not linked to caller");
        };
      };
      case (?callerPersonnelId) {
        if (callerPersonnelId != personnelId and not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own attendance score");
        };
      };
    };
    
    if (not isPersonnelInCompany(personnelId, companyId)) {
      Runtime.trap("Personnel does not belong to this company");
    };
    
    let records = attendanceRecords.values().toArray().filter(
      func (record) {
        record.personnelId == personnelId and record.companyId == companyId;
      }
    );
    
    var score : Nat = 100;
    let deductionPerIssue : Nat = 5;
    
    for (record in records.vals()) {
      if (score > deductionPerIssue) {
        score -= deductionPerIssue;
      } else {
        score := 0;
      };
    };
    
    if (score > 100) { 100 } else { score };
  };

  public query ({ caller }) func getPayrollSummary(companyId : Text, month : Nat, year : Nat) : async [PayrollEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payroll summaries");
    };
    if (not isCompanyAdmin(caller, companyId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only company admins can view payroll summaries");
    };
    
    let companyPersonnel = getPersonnelByCompany(companyId);
    
    companyPersonnel.map(
      func (person) : PayrollEntry {
        let personRecords = attendanceRecords.values().toArray().filter(
          func (record) {
            record.personnelId == person.id and record.companyId == companyId;
          }
        );
        
        var totalMinutes : Int = 0;
        var lateCount : Nat = 0;
        
        for (record in personRecords.vals()) {
          if (record.hasCheckedOut) {
            let duration = record.checkOut - record.checkIn;
            totalMinutes += duration / 60_000_000_000;
          };
        };
        
        let personLeaves = leaveRequests.values().toArray().filter(
          func (req) {
            req.personnelId == person.id and req.status == "approved";
          }
        );
        
        var leaveDays : Nat = 0;
        for (leave in personLeaves.vals()) {
          leaveDays += leave.days;
        };
        
        {
          personnelId = person.id;
          name = person.name;
          department = person.department;
          totalWorkMinutes = totalMinutes;
          absenceDays = 0;
          leaveDays;
          lateCount;
          month;
          year;
        };
      }
    );
  };
};
