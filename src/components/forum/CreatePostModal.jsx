import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["University Questions", "NBT Prep", "Course Choices", "Bursaries", "General"];
const SA_UNIVERSITIES = ["UCT", "Wits", "Stellenbosch", "UP", "UKZN", "UJ", "UWC", "Rhodes", "NWU", "UFH", "UFS", "UNISA", "DUT", "CPUT", "TUT", "Other"];

export default function CreatePostModal({ user, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [universityTag, setUniversityTag] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and details.");
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          title: title.trim(),
          body: body.trim(),
          category: category,
          university_tag: universityTag || null,
          author_email: user.email,
          author_name: user.full_name || user.email,
          likes: 0,
          liked_by: [],
          comment_count: 0,
          is_flagged: false,
          is_removed: false,
          is_pinned: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Discussion posted successfully!");
      onCreated(data);
      onClose();
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error(`Failed to post: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Start a Discussion</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input
              placeholder="What's your question or topic?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Details</label>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Provide more details about your question..."
              value={body}
              onChange={e => setBody(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">University Tag <span className="text-muted-foreground">(optional)</span></label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={universityTag}
                onChange={e => setUniversityTag(e.target.value)}
              >
                <option value="">None</option>
                {SA_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !title.trim() || !body.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {loading ? "Posting..." : "Post Discussion"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}