import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // This is a system function, so we might need service role if run automatically
        // But for now, we'll assume it's triggered by an admin user or scheduled task which has permissions
        // Let's use service role to be safe as it accesses all employees
        
        // Authorization: require admin user OR a valid job secret for headless runs
          const user = await base44.auth.me().catch(() => null);
          const expectedSecret = Deno.env.get('DOC_EXPIRATIONS_JOB_SECRET') || '';
          const providedSecret = req.headers.get('x-job-secret') || new URL(req.url).searchParams.get('job_secret') || '';
          const authorizedBySecret = expectedSecret && providedSecret && providedSecret === expectedSecret;

          if (!user && !authorizedBySecret) {
              try {
                  await base44.asServiceRole.entities.SecurityEvent.create({
                      event_type: 'unauthorized_access',
                      severity: 'high',
                      message: 'checkDocumentExpirations unauthorized invocation',
                      ip_address: req.headers.get('x-forwarded-for') || null,
                      user_agent: req.headers.get('user-agent') || null,
                      route: 'functions/checkDocumentExpirations'
                  });
              } catch (_) {}
              return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }
          if (user && user.role !== 'admin') {
              return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
          }

        const employees = await base44.asServiceRole.entities.Employee.list({ limit: 1000, status: 'active' });
        const members = await base44.asServiceRole.entities.Member.list({ limit: 1000 });

        const notifications = [];
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        const checkDocuments = (person, type) => {
            if (!person.documents) return;
            
            // Group by group_id to find latest versions (mainly for employees, members usually list all)
            const latestDocs = {};
            person.documents.forEach(doc => {
                const groupId = doc.group_id || doc.id || doc.name; 
                if (!latestDocs[groupId] || (doc.version || 1) > (latestDocs[groupId].version || 1)) {
                    latestDocs[groupId] = doc;
                }
            });
            
            for (const doc of Object.values(latestDocs)) {
                if (!doc.expiration_date) continue;
                
                const expDate = new Date(doc.expiration_date);
                const diffTime = expDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays <= 30 && diffDays >= 0) {
                     notifications.push({
                         message: `${type} Document Expiring: "${doc.name}" for ${person.first_name} ${person.last_name} expires in ${diffDays} days (${doc.expiration_date}).`,
                         type: "alert",
                         user_email: null, // System wide notification for admins
                         related_entity_id: person.id,
                         related_entity_type: type.toLowerCase(),
                         link: `/admin?tab=${type === 'Member' ? 'members' : 'employees'}&${type === 'Member' ? 'memberId' : 'employeeId'}=${person.id}`
                     });
                } else if (diffDays < 0) {
                     notifications.push({
                         message: `${type} Document EXPIRED: "${doc.name}" for ${person.first_name} ${person.last_name} expired on ${doc.expiration_date}.`,
                         type: "alert",
                         user_email: null,
                         related_entity_id: person.id,
                         related_entity_type: type.toLowerCase(),
                         link: `/admin?tab=${type === 'Member' ? 'members' : 'employees'}&${type === 'Member' ? 'memberId' : 'employeeId'}=${person.id}`
                     });
                }
            }
        };

        for (const emp of employees) {
            checkDocuments(emp, 'Employee');
        }

        for (const member of members) {
            checkDocuments(member, 'Member');
        }
        
        if (notifications.length > 0) {
            // Check for duplicate notifications in the last 24 hours to avoid spamming
            const recentNotes = await base44.asServiceRole.entities.Notification.list({ 
                limit: 100, 
                sort: { created_at: -1 } 
            });
            
            const uniqueNotifications = notifications.filter(newNote => {
                // Check if a similar message exists created recently
                // This is a naive check
                return !recentNotes.some(existing => 
                    existing.message === newNote.message && 
                    new Date(existing.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );
            });
            
            if (uniqueNotifications.length > 0) {
                await base44.asServiceRole.entities.Notification.bulkCreate(uniqueNotifications);
            }
            
            return Response.json({ status: 'success', alerts_generated: uniqueNotifications.length });
        }

        return Response.json({ status: 'success', alerts_generated: 0 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});