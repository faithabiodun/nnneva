import { motherById } from "@/lib/fixtures";

import MotherProfile from "./MotherProfile";

export async function generateMetadata({ params }: PageProps<"/mothers/[id]">) {
  const { id } = await params;
  const mother = motherById(id);
  return { title: mother ? mother.name : "Mother" };
}

export default async function MotherPage({ params }: PageProps<"/mothers/[id]">) {
  const { id } = await params;
  return <MotherProfile id={id} />;
}
