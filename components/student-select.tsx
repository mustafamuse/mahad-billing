"use client";

import { Student } from "@/lib/types";
import { STUDENTS } from "@/lib/data";
import { calculateStudentPrice } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface StudentSelectProps {
  form: UseFormReturn<any>;
  selectedStudents: Student[];
  setSelectedStudents: (students: Student[]) => void;
}

export function StudentSelect({
  form,
  selectedStudents,
  setSelectedStudents,
}: StudentSelectProps) {
  const handleStudentSelect = (studentId: string) => {
    const student = STUDENTS.find((s) => s.id === studentId);
    if (student && !selectedStudents.find((s) => s.id === student.id)) {
      const newStudents = [...selectedStudents, student];
      setSelectedStudents(newStudents);
      form.setValue("students", newStudents.map((s) => s.id));
    }
  };

  const removeStudent = (studentId: string) => {
    const newStudents = selectedStudents.filter((s) => s.id !== studentId);
    setSelectedStudents(newStudents);
    form.setValue("students", newStudents.map((s) => s.id));
  };

  const renderStudentOption = (student: Student) => {
    const isSelected = selectedStudents.some((s) => s.id === student.id);

    return (
      <SelectItem
        key={student.id}
        value={student.id}
        disabled={isSelected}
      >
        <span className="font-medium">{student.name}</span>
      </SelectItem>
    );
  };

  const renderSelectedStudent = (student: Student) => {
    const { price, discount, isSiblingDiscount } = calculateStudentPrice(student);
    const basePrice = student.monthlyRate;

    return (
      <div
        key={student.id}
        className="group flex items-center justify-between w-full bg-card p-4 rounded-lg border shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{student.name}</span>
            {isSiblingDiscount && (
              <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                Family Discount Applied
              </Badge>
            )}
          </div>
          {isSiblingDiscount && (
            <div className="text-sm text-muted-foreground">
              <span className="line-through">${basePrice}</span>
              {" → "}
              <span className="text-green-600 dark:text-green-400 font-medium">
                ${price}
              </span>
              <span className="ml-1">per month</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => removeStudent(student.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Select Students</h2>
        <Select onValueChange={handleStudentSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose students to enroll" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <ScrollArea className="h-[300px]">
                {STUDENTS.map(renderStudentOption)}
              </ScrollArea>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {selectedStudents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">
              Selected Students ({selectedStudents.length})
            </h3>
          </div>
          <div className="space-y-2">
            {selectedStudents.map(renderSelectedStudent)}
          </div>
        </div>
      )}

      {form.formState.errors.students && (
        <p className="text-sm text-destructive mt-2">
          {form.formState.errors.students.message as string}
        </p>
      )}
    </div>
  );
}